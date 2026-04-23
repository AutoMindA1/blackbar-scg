import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { prisma } from '../db.js';

export async function resolveOrg(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const orgHeader = req.headers['x-org-id'] as string | undefined;

  if (orgHeader) {
    try {
      const member = await prisma.organizationMember.findUnique({
        where: { orgId_userId: { orgId: orgHeader, userId: req.userId } },
      });
      if (!member) {
        res.status(403).json({ error: 'Not a member of this organization' });
        return;
      }
      req.orgId = orgHeader;
    } catch {
      // OrganizationMember table may not exist yet — skip org scoping
    }
  } else if (!req.orgId) {
    try {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: req.userId },
        orderBy: { createdAt: 'asc' },
      });
      if (membership) {
        req.orgId = membership.orgId;
      }
    } catch {
      // OrganizationMember table may not exist yet
    }
  }

  next();
}
