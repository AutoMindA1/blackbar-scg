/**
 * RequireRole Middleware Tests
 *
 * Verifies that requireRole(...roles) returns express middleware that:
 *   - returns 401 when req.userId is missing
 *   - returns 401 when the user is not found in the DB
 *   - returns 403 when the user's role is not in the allow-list
 *   - calls next() when the user's role matches
 *   - returns 500 on DB error
 *   - composes multiple roles correctly
 *
 * Target: server/middleware/requireRole.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';

const mockFindUnique = vi.fn();
vi.mock('../db.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { requireRole, ADMIN_ONLY } from '../middleware/requireRole.js';

interface MockRes {
  statusCode: number;
  body: unknown;
  status(code: number): MockRes;
  json(data: unknown): MockRes;
}

function createMockReq(userId?: string): AuthRequest {
  return { userId } as AuthRequest;
}

function createMockRes(): MockRes {
  const res: MockRes = {
    statusCode: 0,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
  };
  return res;
}

describe('requireRole middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when userId is missing', async () => {
    const guard = requireRole('admin');
    const req = createMockReq(undefined);
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await guard(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns 401 when user not found in DB', async () => {
    mockFindUnique.mockResolvedValue(null);
    const guard = requireRole('admin');
    const req = createMockReq('user-ghost');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await guard(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'User not found' });
  });

  it('returns 403 when role does not match', async () => {
    mockFindUnique.mockResolvedValue({ role: 'expert' });
    const guard = requireRole('admin');
    const req = createMockReq('user-mariz');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await guard(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Insufficient role' });
  });

  it('calls next() when role matches', async () => {
    mockFindUnique.mockResolvedValue({ role: 'admin' });
    const guard = requireRole('admin');
    const req = createMockReq('user-caleb');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await guard(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(0);
  });

  it('accepts multiple allowed roles', async () => {
    const guard = requireRole('admin', 'expert');
    const next = vi.fn() as unknown as NextFunction;

    mockFindUnique.mockResolvedValue({ role: 'expert' });
    await guard(createMockReq('user-lane'), createMockRes() as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    mockFindUnique.mockResolvedValue({ role: 'admin' });
    await guard(createMockReq('user-caleb'), createMockRes() as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(2);

    mockFindUnique.mockResolvedValue({ role: 'operator' });
    const blockedRes = createMockRes();
    await guard(createMockReq('user-op'), blockedRes as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(blockedRes.statusCode).toBe(403);
  });

  it('returns 500 on DB error', async () => {
    mockFindUnique.mockRejectedValue(new Error('Connection refused'));
    const guard = requireRole('admin');
    const req = createMockReq('user-x');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await guard(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    consoleSpy.mockRestore();
  });

  it('ADMIN_ONLY shortcut blocks expert', async () => {
    mockFindUnique.mockResolvedValue({ role: 'expert' });
    const req = createMockReq('user-lane');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await ADMIN_ONLY(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('ADMIN_ONLY shortcut allows admin', async () => {
    mockFindUnique.mockResolvedValue({ role: 'admin' });
    const req = createMockReq('user-caleb');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await ADMIN_ONLY(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
