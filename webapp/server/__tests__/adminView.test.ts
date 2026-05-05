/**
 * Admin-view toggle handler tests.
 *
 * Verifies authorization (admin OR expert+canRequestAdminView), audit-log
 * writes on enter/exit, and rejection of operators / unflagged experts /
 * malformed inputs.
 *
 * Target: server/routes/adminView.ts (toggleAdminViewHandler)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';

const mockFindUnique = vi.fn();
const mockAuditCreate = vi.fn();

vi.mock('../db.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => mockAuditCreate(...args),
    },
  },
}));

import { toggleAdminViewHandler } from '../routes/adminView.js';

interface MockRes {
  statusCode: number;
  body: unknown;
  status(code: number): MockRes;
  json(data: unknown): MockRes;
}

function createMockReq(body: unknown, userId?: string): AuthRequest {
  return { userId, body } as unknown as AuthRequest;
}

function createMockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
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

describe('toggleAdminViewHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditCreate.mockResolvedValue(undefined);
  });

  it('200 with audit log entry when admin enables', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-1', role: 'admin', canRequestAdminView: false });
    const req = createMockReq({ enabled: true }, 'user-1');
    const res = createMockRes();

    await toggleAdminViewHandler(req, res as unknown as Response);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ enabled: true });
    expect(mockAuditCreate).toHaveBeenCalledOnce();
    const call = mockAuditCreate.mock.calls[0][0];
    expect(call.data.action).toBe('admin_view.enter');
    expect(call.data.actorId).toBe('user-1');
    expect(call.data.target).toBe('user-1');
  });

  it('audit action becomes admin_view.exit on disable', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-1', role: 'admin', canRequestAdminView: false });
    const req = createMockReq({ enabled: false }, 'user-1');
    const res = createMockRes();

    await toggleAdminViewHandler(req, res as unknown as Response);

    expect(res.statusCode).toBe(200);
    const call = mockAuditCreate.mock.calls[0][0];
    expect(call.data.action).toBe('admin_view.exit');
  });

  it('expert + canRequestAdminView passes', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-lane', role: 'expert', canRequestAdminView: true });
    const req = createMockReq({ enabled: true }, 'user-lane');
    const res = createMockRes();

    await toggleAdminViewHandler(req, res as unknown as Response);

    expect(res.statusCode).toBe(200);
    expect(mockAuditCreate).toHaveBeenCalledOnce();
  });

  it('expert without flag is 403', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-mariz', role: 'expert', canRequestAdminView: false });
    const req = createMockReq({ enabled: true }, 'user-mariz');
    const res = createMockRes();

    await toggleAdminViewHandler(req, res as unknown as Response);

    expect(res.statusCode).toBe(403);
    expect(mockAuditCreate).not.toHaveBeenCalled();
  });

  it('operator is 403 regardless of flag', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-op', role: 'operator', canRequestAdminView: false });
    const req = createMockReq({ enabled: true }, 'user-op');
    const res = createMockRes();

    await toggleAdminViewHandler(req, res as unknown as Response);

    expect(res.statusCode).toBe(403);
    expect(mockAuditCreate).not.toHaveBeenCalled();
  });

  it('401 when userId missing on request', async () => {
    const req = createMockReq({ enabled: true }, undefined);
    const res = createMockRes();

    await toggleAdminViewHandler(req, res as unknown as Response);

    expect(res.statusCode).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('400 on malformed body', async () => {
    const req = createMockReq({ wrong: 'shape' }, 'user-1');
    const res = createMockRes();

    await toggleAdminViewHandler(req, res as unknown as Response);

    expect(res.statusCode).toBe(400);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('401 when user vanished from DB', async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = createMockReq({ enabled: true }, 'user-ghost');
    const res = createMockRes();

    await toggleAdminViewHandler(req, res as unknown as Response);

    expect(res.statusCode).toBe(401);
    expect(mockAuditCreate).not.toHaveBeenCalled();
  });
});
