/**
 * AuditLog Writer Tests
 *
 * Verifies that writeAuditLog(entry) maps an AuditEntry into a Prisma
 * auditLog.create call with the expected shape, including the required
 * `reason` field and optional before/after JSON.
 *
 * Target: server/services/auditLog.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
vi.mock('../db.js', () => ({
  prisma: {
    auditLog: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { writeAuditLog } from '../services/auditLog.js';

describe('writeAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue(undefined);
  });

  it('writes a minimal entry (no before/after)', async () => {
    await writeAuditLog({
      actorId: 'user-caleb',
      action: 'admin.route.enter',
      target: '/admin/cases/123/orchestrator',
      reason: 'manual debugging',
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        actorId: 'user-caleb',
        action: 'admin.route.enter',
        target: '/admin/cases/123/orchestrator',
        reason: 'manual debugging',
        before: undefined,
        after: undefined,
      },
    });
  });

  it('includes before/after JSON when provided', async () => {
    const before = { stage: 'research' };
    const after = { stage: 'drafting' };

    await writeAuditLog({
      actorId: 'user-caleb',
      action: 'pipeline.force_advance',
      target: 'case-123',
      reason: 'stuck on Lane Gate, manual override',
      before,
      after,
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        actorId: 'user-caleb',
        action: 'pipeline.force_advance',
        target: 'case-123',
        reason: 'stuck on Lane Gate, manual override',
        before,
        after,
      },
    });
  });

  it('propagates DB errors to the caller', async () => {
    mockCreate.mockRejectedValue(new Error('Connection refused'));

    await expect(
      writeAuditLog({
        actorId: 'user-x',
        action: 'noop',
        target: 't',
        reason: 'r',
      }),
    ).rejects.toThrow('Connection refused');
  });
});
