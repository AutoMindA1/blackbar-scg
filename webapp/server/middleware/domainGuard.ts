import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { prisma } from '../db.js';

/**
 * Domain verification cache entry.
 * Stores the email domain and a TTL timestamp to avoid repeated DB lookups.
 */
interface CacheEntry {
  domain: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const domainCache = new Map<string, CacheEntry>();

/**
 * Parse allowed domains from the ALLOWED_EMAIL_DOMAINS env var (comma-separated).
 * Falls back to the provided default list.
 */
function resolveAllowedDomains(defaults: string[]): string[] {
  const envDomains = process.env.ALLOWED_EMAIL_DOMAINS;
  if (envDomains) {
    return envDomains
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0);
  }
  return defaults.map((d) => d.toLowerCase());
}

/**
 * Factory function returning Express middleware that restricts access
 * to users whose email domain is in the allowed list.
 *
 * Requires `authMiddleware` to have run first (sets `req.userId`).
 *
 * @param allowedDomains - Domains to permit. Defaults to ['swainston.com'].
 *   Overridden by the ALLOWED_EMAIL_DOMAINS env var when set.
 */
export function domainGuard(allowedDomains: string[] = ['swainston.com']) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const domains = resolveAllowedDomains(allowedDomains);

    // Check cache first
    const now = Date.now();
    const cached = domainCache.get(userId);
    if (cached && cached.expiresAt > now) {
      if (domains.includes(cached.domain)) {
        next();
        return;
      }
      res.status(403).json({ error: 'Access restricted to authorized domains' });
      return;
    }

    // Look up user email from DB
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user) {
        res.status(403).json({ error: 'Access restricted to authorized domains' });
        return;
      }

      const domain = user.email.split('@')[1]?.toLowerCase();
      if (!domain) {
        res.status(403).json({ error: 'Access restricted to authorized domains' });
        return;
      }

      // Cache the result
      domainCache.set(userId, { domain, expiresAt: now + CACHE_TTL_MS });

      if (domains.includes(domain)) {
        next();
        return;
      }

      res.status(403).json({ error: 'Access restricted to authorized domains' });
    } catch (err) {
      console.error('[domainGuard] DB lookup failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/** Pre-configured guard: only @swainston.com users */
export const SWAINSTON_ONLY = domainGuard(['swainston.com']);

/**
 * Clear the domain cache — exposed for testing.
 * @internal
 */
export function _clearDomainCache() {
  domainCache.clear();
}
