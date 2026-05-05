import type { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../db.js';
import type { AuthRequest } from './auth.js';

export function requireRole(...roles: UserRole[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true },
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      if (!roles.includes(user.role)) {
        res.status(403).json({ error: 'Insufficient role' });
        return;
      }

      next();
    } catch (err) {
      console.error('[requireRole] DB lookup failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export const ADMIN_ONLY = requireRole(UserRole.admin);
