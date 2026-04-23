import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthRequest extends Omit<Request, 'params'> {
  userId?: string;
  orgId?: string;
  params: Record<string, string>;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const fromHeader = header?.startsWith('Bearer ');
  const token = fromHeader
    ? header!.slice(7)
    : (req.query.token as string | undefined);

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  if (!fromHeader && req.query.token) {
    console.warn(`[auth] SSE auth via query param for ${req.path}`);
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; orgId?: string };
    req.userId = payload.userId;
    req.orgId = payload.orgId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
