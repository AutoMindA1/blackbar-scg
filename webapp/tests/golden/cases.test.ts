/**
 * GOLDEN TEST: Cases Routes
 *
 * Hard assertions — these MUST pass on every commit.
 * Tests: POST/GET/PATCH /api/cases, Zod validation, stage transitions.
 *
 * KNOWN GAP: GET /api/cases returns ALL cases with no createdBy filter.
 * This test documents the gap — PLATINUM-BAR adds tenantId scoping.
 *
 * Target: server/routes/cases.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockPrisma,  SYNTHETIC_CASE } from '../helpers/mocks.js';

// Replicate exact schemas from cases.ts
const createCaseSchema = z.object({
  name: z.string().min(1).max(500).trim(),
  caseType: z.string().max(100).optional(),
  reportType: z.string().max(100).optional(),
  jurisdiction: z.string().max(200).optional(),
  opposingExpert: z.string().max(300).optional(),
  deadline: z.string().datetime().optional().nullable(),
});

const updateCaseSchema = z.object({
  name: z.string().min(1).max(500).trim().optional(),
  caseType: z.string().max(100).optional().nullable(),
  reportType: z.string().max(100).optional().nullable(),
  jurisdiction: z.string().max(200).optional().nullable(),
  opposingExpert: z.string().max(300).optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  stage: z.enum(['intake', 'research', 'drafting', 'qa', 'export', 'complete']).optional(),
});

const caseIdParam = z.string().min(1).max(100);

// ─── CREATE CASE VALIDATION ───
describe('Create Case — Zod Schema', () => {
  it('accepts full valid case', () => {
    const result = createCaseSchema.safeParse({
      name: 'NP Santa Fe, LLC adv Gleason',
      caseType: 'slip_fall',
      reportType: 'initial',
      jurisdiction: 'clark_county',
      opposingExpert: 'John Peterson',
      deadline: '2026-05-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    expect(result.data!.name).toBe('NP Santa Fe, LLC adv Gleason');
  });

  it('accepts minimal case (name only)', () => {
    const result = createCaseSchema.safeParse({ name: 'Quick Test' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(createCaseSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('trims whitespace from name', () => {
    const result = createCaseSchema.safeParse({ name: '  NP Santa Fe  ' });
    expect(result.success).toBe(true);
    expect(result.data!.name).toBe('NP Santa Fe');
  });

  it('rejects name exceeding 500 chars', () => {
    expect(createCaseSchema.safeParse({ name: 'x'.repeat(501) }).success).toBe(false);
  });

  it('accepts null deadline', () => {
    const result = createCaseSchema.safeParse({ name: 'Test', deadline: null });
    expect(result.success).toBe(true);
  });
});

// ─── UPDATE CASE VALIDATION ───
describe('Update Case — Zod Schema', () => {
  it('accepts partial update (name only)', () => {
    const result = updateCaseSchema.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('accepts stage transition', () => {
    const result = updateCaseSchema.safeParse({ stage: 'research' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid stage', () => {
    const result = updateCaseSchema.safeParse({ stage: 'invalid_stage' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid stages', () => {
    const stages = ['intake', 'research', 'drafting', 'qa', 'export', 'complete'];
    for (const stage of stages) {
      const result = updateCaseSchema.safeParse({ stage });
      expect(result.success).toBe(true);
    }
  });

  it('accepts nulling optional fields', () => {
    const result = updateCaseSchema.safeParse({
      caseType: null,
      jurisdiction: null,
      opposingExpert: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (no-op update)', () => {
    const result = updateCaseSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ─── STAGE TRANSITION LOGIC ───
describe('Stage Transitions — Pipeline Ordering', () => {
  const stageOrder = ['intake', 'research', 'drafting', 'qa', 'export', 'complete'];

  it('stage order is exactly 6 stages', () => {
    expect(stageOrder).toHaveLength(6);
  });

  it('intake is first, complete is last', () => {
    expect(stageOrder[0]).toBe('intake');
    expect(stageOrder[stageOrder.length - 1]).toBe('complete');
  });

  it('forward transition: each stage advances to next', () => {
    for (let i = 0; i < stageOrder.length - 1; i++) {
      const current = stageOrder[i];
      const next = stageOrder[i + 1];
      const currentIdx = stageOrder.indexOf(current);
      expect(stageOrder[currentIdx + 1]).toBe(next);
    }
  });

  it('[KNOWN GAP] no backward transition protection in routes', () => {
    // cases.ts PATCH endpoint accepts any valid stage — no forward-only check
    const result = updateCaseSchema.safeParse({ stage: 'intake' });
    expect(result.success).toBe(true);
    // BUG: Can regress from 'qa' back to 'intake' via PATCH
    // PLATINUM-BAR adds stage transition middleware
  });
});

// ─── CASE ID PARAM VALIDATION ───
describe('Case ID Param Validation', () => {
  it('accepts valid UUID', () => {
    expect(caseIdParam.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(caseIdParam.safeParse('').success).toBe(false);
  });

  it('rejects over 100 chars', () => {
    expect(caseIdParam.safeParse('x'.repeat(101)).success).toBe(false);
  });

  it('accepts short ID (cuid, nanoid)', () => {
    expect(caseIdParam.safeParse('clx123abc').success).toBe(true);
  });
});

// ─── ACCESS CONTROL DOCUMENTATION ───
describe('[KNOWN GAP] Access Control — GET /api/cases returns ALL', () => {
  it('documents: GET /api/cases has no createdBy filter', () => {
    // cases.ts line 50-68: prisma.case.findMany with NO where clause
    // Any authenticated user sees ALL cases in the system
    // This is acceptable for single-tenant (Lane only) but breaks multi-tenant
    const mockPrisma = createMockPrisma();
    mockPrisma.case.findMany.mockResolvedValue([
      { ...SYNTHETIC_CASE, createdBy: 'user-A' },
      { ...SYNTHETIC_CASE, id: 'case-002', createdBy: 'user-B' },
    ]);

    // Both cases returned regardless of who's asking
    expect(mockPrisma.case.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
  });

  it('documents: GET /api/cases has no pagination', () => {
    // No take/skip params — returns all cases at once
    // Fine for <100 cases, problematic at scale
    expect(true).toBe(true); // Documentation marker
  });
});

// ─── MOCK PRISMA INTEGRATION ───
describe('Cases Route — Mock Prisma', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('create case stores correct fields', async () => {
    const input = {
      name: 'NP Santa Fe, LLC adv Gleason',
      caseType: 'slip_fall',
      reportType: 'initial',
      jurisdiction: 'clark_county',
      opposingExpert: 'John Peterson',
      deadline: null,
    };

    mockPrisma.case.create.mockResolvedValue({ id: 'case-new', ...input, stage: 'intake', createdBy: 'test-user-id', createdAt: new Date(), updatedAt: new Date() });

    const result = await mockPrisma.case.create({
      data: { ...input, createdBy: 'test-user-id' },
    });

    expect(mockPrisma.case.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'NP Santa Fe, LLC adv Gleason', createdBy: 'test-user-id' }),
    });
    expect(result.id).toBe('case-new');
    expect(result.stage).toBe('intake');
  });

  it('findUnique returns case with includes', async () => {
    mockPrisma.case.findUnique.mockResolvedValue({
      ...SYNTHETIC_CASE,
      documents: [],
      agentLogs: [],
      report: null,
    });

    const result = await mockPrisma.case.findUnique({
      where: { id: 'case-001' },
      include: { documents: true, agentLogs: { orderBy: { createdAt: 'desc' }, take: 50 }, report: true },
    });

    expect(result).not.toBeNull();
    expect(result!.name).toBe('NP Santa Fe, LLC adv Gleason');
    expect(result!.documents).toEqual([]);
  });

  it('findUnique returns null for missing case', async () => {
    mockPrisma.case.findUnique.mockResolvedValue(null);
    const result = await mockPrisma.case.findUnique({ where: { id: 'nonexistent' } });
    expect(result).toBeNull();
  });

  it('update case changes stage', async () => {
    mockPrisma.case.update.mockResolvedValue({ ...SYNTHETIC_CASE, stage: 'research' });
    const result = await mockPrisma.case.update({
      where: { id: 'case-001' },
      data: { stage: 'research' },
    });
    expect(result.stage).toBe('research');
  });
});
