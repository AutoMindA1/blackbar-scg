import { Request, Response, NextFunction } from 'express';
import { createChildLogger } from '../lib/logger.js';
import { prisma } from '../db.js';

const auditLogger = createChildLogger({ component: 'audit' });

// Paths to skip audit logging
const SKIP_PATHS = new Set(['/api/health']);

function isSSEStream(req: Request): boolean {
  return req.path.endsWith('/agents/stream');
}

/**
 * Derive a semantic action name from HTTP method + path.
 * Examples: "case.create", "report.export", "auth.login", "document.upload"
 */
function deriveAction(method: string, path: string): string {
  const segments = path.replace(/^\/api\//, '').split('/').filter(Boolean);
  // segments examples:
  //   auth/login       -> ["auth", "login"]
  //   auth/me          -> ["auth", "me"]
  //   cases            -> ["cases"]
  //   cases/:id        -> ["cases", "<id>"]
  //   cases/:id/documents -> ["cases", "<id>", "documents"]
  //   cases/:id/agents/:stage -> ["cases", "<id>", "agents", "<stage>"]
  //   cases/:id/report -> ["cases", "<id>", "report"]
  //   cases/:id/export -> ["cases", "<id>", "export"]
  //   cases/:id/approve -> ["cases", "<id>", "approve"]
  //   cases/:id/qa     -> ["cases", "<id>", "qa"]
  //   cases/:id/prowl  -> ["cases", "<id>", "prowl"]

  if (segments[0] === 'auth') {
    const sub = segments[1] || 'unknown';
    return `auth.${sub}`;
  }

  if (segments[0] === 'cases') {
    // No sub-resource: /api/cases or /api/cases/:id
    if (segments.length <= 2) {
      const verbMap: Record<string, string> = {
        GET: segments.length === 1 ? 'case.list' : 'case.get',
        POST: 'case.create',
        PATCH: 'case.update',
        PUT: 'case.update',
        DELETE: 'case.delete',
      };
      return verbMap[method] || 'case.unknown';
    }

    // Sub-resource: segments[2] is the resource type
    const resource = segments[2];

    if (resource === 'documents') {
      return method === 'POST' ? 'document.upload' : 'document.list';
    }

    if (resource === 'agents') {
      return method === 'POST' ? 'agent.trigger' : 'agent.stream';
    }

    if (resource === 'report') {
      const verbMap: Record<string, string> = {
        GET: 'report.get',
        PUT: 'report.save',
        POST: 'report.save',
      };
      return verbMap[method] || 'report.unknown';
    }

    if (resource === 'export') {
      return 'report.export';
    }

    if (resource === 'approve') {
      return 'case.approve';
    }

    if (resource === 'qa') {
      return 'qa.get';
    }

    if (resource === 'prowl') {
      return 'prowl.status';
    }

    return `${resource}.${method.toLowerCase()}`;
  }

  return `${segments[0] || 'unknown'}.${method.toLowerCase()}`;
}

/**
 * Derive the resource type from the request path.
 */
function deriveResourceType(path: string): string {
  const segments = path.replace(/^\/api\//, '').split('/').filter(Boolean);

  if (segments[0] === 'auth') return 'auth';
  if (segments[0] === 'cases') {
    if (segments.length <= 2) return 'cases';
    const sub = segments[2];
    if (sub === 'documents') return 'documents';
    if (sub === 'agents') return 'agents';
    if (sub === 'report' || sub === 'export') return 'reports';
    if (sub === 'approve' || sub === 'qa' || sub === 'prowl') return sub;
    return sub;
  }
  return segments[0] || 'unknown';
}

/**
 * Extract resource ID from the path (the :id segment after /cases/).
 */
function extractResourceId(path: string): string | undefined {
  const match = path.match(/\/api\/cases\/([^/]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return undefined;
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip health checks and SSE streams
  if (SKIP_PATHS.has(req.path) || isSSEStream(req)) {
    next();
    return;
  }

  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    const action = deriveAction(req.method, req.path);
    const resourceType = deriveResourceType(req.path);
    const resourceId = extractResourceId(req.path);
    const userId = (req as unknown as { userId?: string }).userId;

    const auditData: Record<string, unknown> = {
      action,
      resourceType,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Math.round(durationMs * 100) / 100,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    if (resourceId) auditData.resourceId = resourceId;
    if (userId) auditData.userId = userId;

    auditLogger.audit(action, auditData);

    // Fire-and-forget: persist to database if AuditLog model exists
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).auditLog?.create({
        data: {
          action,
          resourceType,
          resourceId: resourceId || null,
          userId: userId || null,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
          duration: Math.round(durationMs),
        },
      })?.then?.(() => {})?.catch?.(() => {});
    } catch {
      // Silently ignore — AuditLog model may not exist yet
    }
  });

  next();
}
