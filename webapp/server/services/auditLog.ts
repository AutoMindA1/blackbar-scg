import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

export interface AuditEntry {
  actorId: string;
  action: string;
  target: string;
  reason: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      target: entry.target,
      reason: entry.reason,
      before: entry.before,
      after: entry.after,
    },
  });
}
