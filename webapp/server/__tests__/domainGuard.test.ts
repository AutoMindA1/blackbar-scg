/**
 * Domain Guard Middleware Tests
 *
 * Verifies that the domainGuard middleware restricts route access
 * to users whose email domain is in the allowed list.
 *
 * Target: server/middleware/domainGuard.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';

// ─── Mock Prisma ───
const mockFindUnique = vi.fn();
vi.mock('../db.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

// Import after mocks are set up
import { domainGuard, SWAINSTON_ONLY, _clearDomainCache } from '../middleware/domainGuard.js';

// ─── Test Helpers ───
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

// ─── Tests ───
describe('domainGuard middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearDomainCache();
    delete process.env.ALLOWED_EMAIL_DOMAINS;
  });

  it('allows @swainston.com user through', async () => {
    mockFindUnique.mockResolvedValue({ email: 'lane@swainston.com' });
    const req = createMockReq('user-lane');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await SWAINSTON_ONLY(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(0); // status() was never called
  });

  it('blocks @gmail.com user with 403', async () => {
    mockFindUnique.mockResolvedValue({ email: 'attacker@gmail.com' });
    const req = createMockReq('user-attacker');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await SWAINSTON_ONLY(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Access restricted to authorized domains' });
  });

  it('blocks @evil.com user with 403', async () => {
    mockFindUnique.mockResolvedValue({ email: 'hacker@evil.com' });
    const req = createMockReq('user-evil');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await SWAINSTON_ONLY(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Access restricted to authorized domains' });
  });

  it('returns 401 when userId is missing (defensive)', async () => {
    const req = createMockReq(undefined);
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await SWAINSTON_ONLY(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('caches domain lookup — second call skips DB query', async () => {
    mockFindUnique.mockResolvedValue({ email: 'lane@swainston.com' });
    const next = vi.fn() as unknown as NextFunction;

    // First call — hits DB
    const req1 = createMockReq('user-lane');
    const res1 = createMockRes();
    await SWAINSTON_ONLY(req1, res1 as unknown as Response, next);
    expect(next).toHaveBeenCalledOnce();
    expect(mockFindUnique).toHaveBeenCalledOnce();

    // Second call — should use cache
    const req2 = createMockReq('user-lane');
    const res2 = createMockRes();
    await SWAINSTON_ONLY(req2, res2 as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(mockFindUnique).toHaveBeenCalledOnce(); // still 1 — no second DB call
  });

  it('custom domain list allows multiple domains', async () => {
    const multiDomainGuard = domainGuard(['swainston.com', 'swainstonconsulting.com']);
    const next = vi.fn() as unknown as NextFunction;

    // swainston.com — allowed
    mockFindUnique.mockResolvedValue({ email: 'lane@swainston.com' });
    const req1 = createMockReq('user-lane');
    const res1 = createMockRes();
    await multiDomainGuard(req1, res1 as unknown as Response, next);
    expect(next).toHaveBeenCalledOnce();

    // swainstonconsulting.com — allowed
    _clearDomainCache();
    mockFindUnique.mockResolvedValue({ email: 'mariz@swainstonconsulting.com' });
    const req2 = createMockReq('user-mariz');
    const res2 = createMockRes();
    await multiDomainGuard(req2, res2 as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(2);

    // otherdomain.com — blocked
    _clearDomainCache();
    mockFindUnique.mockResolvedValue({ email: 'outsider@otherdomain.com' });
    const req3 = createMockReq('user-outsider');
    const res3 = createMockRes();
    await multiDomainGuard(req3, res3 as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(2); // unchanged — blocked
    expect(res3.statusCode).toBe(403);
  });

  it('uses ALLOWED_EMAIL_DOMAINS env var when set', async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = 'example.com, testcorp.org';

    // The default guard should now use env var domains instead of swainston.com
    const guard = domainGuard(); // defaults would be ['swainston.com'] but env overrides

    // example.com — allowed via env var
    mockFindUnique.mockResolvedValue({ email: 'user@example.com' });
    const req1 = createMockReq('user-example');
    const res1 = createMockRes();
    const next = vi.fn() as unknown as NextFunction;
    await guard(req1, res1 as unknown as Response, next);
    expect(next).toHaveBeenCalledOnce();

    // testcorp.org — allowed via env var
    _clearDomainCache();
    mockFindUnique.mockResolvedValue({ email: 'user@testcorp.org' });
    const req2 = createMockReq('user-testcorp');
    const res2 = createMockRes();
    await guard(req2, res2 as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(2);

    // swainston.com — now blocked because env var replaces defaults
    _clearDomainCache();
    mockFindUnique.mockResolvedValue({ email: 'lane@swainston.com' });
    const req3 = createMockReq('user-lane');
    const res3 = createMockRes();
    await guard(req3, res3 as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(2); // unchanged — blocked
    expect(res3.statusCode).toBe(403);
  });

  it('handles user not found in DB', async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = createMockReq('user-ghost');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await SWAINSTON_ONLY(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('handles DB error gracefully', async () => {
    mockFindUnique.mockRejectedValue(new Error('Connection refused'));
    const req = createMockReq('user-error');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    // Suppress console.error noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await SWAINSTON_ONLY(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    consoleSpy.mockRestore();
  });

  it('domain comparison is case-insensitive', async () => {
    mockFindUnique.mockResolvedValue({ email: 'Lane@SWAINSTON.COM' });
    const req = createMockReq('user-lane-upper');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await SWAINSTON_ONLY(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
