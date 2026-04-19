/**
 * Shared test mocks for Prisma, auth middleware, and Express request/response.
 *
 * DESIGN DECISION: We mock at the Prisma layer, not at the database layer.
 * This gives us fast unit tests that target route/service logic without
 * needing a running PostgreSQL instance.
 */

import { vi } from 'vitest';
import type { Response } from 'express';
import type { AuthRequest } from '../../server/middleware/auth.js';

// ─── Mock Prisma Client ───
export function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    case: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    note: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    agentLog: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    report: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

// ─── Mock Express Request ───
export function createMockReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return {
    userId: 'test-user-id',
    params: {},
    query: {},
    body: {},
    headers: { authorization: 'Bearer test-token' },
    on: vi.fn(),
    ...overrides,
  } as unknown as AuthRequest;
}

// ─── Mock Express Response ───
export function createMockRes(): Response & { _json: unknown; _status: number } {
  const res = {
    _json: null as unknown,
    _status: 200,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: unknown) {
      res._json = data;
      return res;
    },
    setHeader: vi.fn().mockReturnThis(),
    writeHead: vi.fn().mockReturnThis(),
    write: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & { _json: unknown; _status: number };
}

// ─── Synthetic Case Data ───
export const SYNTHETIC_CASE = {
  id: 'case-001',
  name: 'NP Santa Fe, LLC adv Gleason',
  caseType: 'slip_fall',
  reportType: 'initial',
  jurisdiction: 'clark_county',
  opposingExpert: 'John Peterson',
  deadline: new Date('2026-05-01'),
  stage: 'intake',
  createdBy: 'test-user-id',
  createdAt: new Date('2026-04-01'),
  updatedAt: new Date('2026-04-01'),
};

export const SYNTHETIC_USER = {
  id: 'test-user-id',
  name: 'Lane Swainston',
  email: 'lane@swainstonconsulting.com',
  passwordHash: '$2b$10$dummyhashfortest1234567890abcdef',
  role: 'operator',
  createdAt: new Date('2026-01-01'),
};

export const SYNTHETIC_DOCUMENT = {
  id: 'doc-001',
  caseId: 'case-001',
  filename: 'retainer_letter.pdf',
  filepath: '/uploads/abc123.pdf',
  sizeBytes: 45000,
  pageCount: 3,
  uploadedAt: new Date('2026-04-01'),
};

export const SYNTHETIC_NOTE = {
  id: 'note-001',
  caseId: 'case-001',
  body: 'Opposing expert failed to document the lighting conditions at the time of the incident.',
  createdAt: new Date('2026-04-17T10:00:00Z'),
  updatedAt: new Date('2026-04-17T10:00:00Z'),
};

export const SYNTHETIC_REPORT = {
  id: 'report-001',
  caseId: 'case-001',
  content: '<h2>Qualifications</h2><p>SCG Personnel visited the subject premises...</p>',
  sections: null,
  version: 1,
  updatedAt: new Date('2026-04-01'),
};
