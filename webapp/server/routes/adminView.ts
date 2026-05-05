/**
 * Admin-view toggle — lets users with `canRequestAdminView=true` (Lane today)
 * temporarily render admin internals on case routes without changing their
 * persisted role. Toggle state is held client-side in sessionStorage; the
 * server's job here is to authorize the request and audit-log every entry/exit.
 *
 * Per ADMIN-PANEL-SPEC.md §Hard rules: no admin action skips audit logging.
 * Per ADMIN-PANEL-SPEC.md §Authority: real admins also pass; operators do not.
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { writeAuditLog } from '../services/auditLog.js';

const toggleSchema = z.object({ enabled: z.boolean() }).strict();

/**
 * Direct-call handler — exported so tests can invoke it with mock req/res
 * without spinning up Express, mirroring the project's domainGuard pattern.
 */
export async function toggleAdminViewHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { enabled } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, role: true, canRequestAdminView: true },
  });
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  // Real admins always allowed; experts only if explicitly granted.
  const allowed = user.role === UserRole.admin || user.canRequestAdminView;
  if (!allowed) {
    res.status(403).json({ error: 'Admin view not permitted for this user' });
    return;
  }

  await writeAuditLog({
    actorId: user.id,
    action: enabled ? 'admin_view.enter' : 'admin_view.exit',
    target: user.id,
    reason: 'self-grant via expert toggle',
    after: { enabled },
  });

  res.json({ enabled });
}

const router = Router();
router.use(authMiddleware);
router.post('/toggle', toggleAdminViewHandler);

export default router;
