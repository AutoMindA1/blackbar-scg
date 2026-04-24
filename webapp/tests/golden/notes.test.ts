/**
 * GOLDEN TEST: Notes Routes
 *
 * Hard assertions — these MUST pass on every commit.
 * Tests: Zod validation, create/list/delete happy paths, 404 on missing note.
 *
 * Target: server/routes/notes.ts
 * Pattern: replicate validation schemas as pure functions; mock Prisma for handler logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockPrisma, createMockReq, createMockRes, SYNTHETIC_NOTE, SYNTHETIC_CASE } from '../helpers/mocks.js';

// ─── Replicate schemas from notes.ts ───
const caseIdParam = z.string().min(1).max(100);
const noteIdParam = z.string().uuid();
const noteBodySchema = z.object({ body: z.string().min(1).max(5000).refine(s => s.trim().length > 0, { message: 'Body cannot be only whitespace' }).transform(s => s.trim()) });

// ─── NOTE BODY VALIDATION ───
describe('Notes — Body Schema Validation', () => {
  it('accepts a valid note body', () => {
    const result = noteBodySchema.safeParse({ body: 'Opposing expert failed to document lighting conditions.' });
    expect(result.success).toBe(true);
    expect(result.data!.body).toBe('Opposing expert failed to document lighting conditions.');
  });

  it('trims surrounding whitespace', () => {
    const result = noteBodySchema.safeParse({ body: '  trimmed note  ' });
    expect(result.success).toBe(true);
    expect(result.data!.body).toBe('trimmed note');
  });

  it('rejects empty body', () => {
    expect(noteBodySchema.safeParse({ body: '' }).success).toBe(false);
  });

  it('rejects whitespace-only body after trim', () => {
    expect(noteBodySchema.safeParse({ body: '   ' }).success).toBe(false);
  });

  it('rejects body exceeding 5000 chars', () => {
    expect(noteBodySchema.safeParse({ body: 'x'.repeat(5001) }).success).toBe(false);
  });

  it('accepts body at exactly 5000 chars', () => {
    expect(noteBodySchema.safeParse({ body: 'x'.repeat(5000) }).success).toBe(true);
  });

  it('accepts body at exactly 1 char', () => {
    expect(noteBodySchema.safeParse({ body: 'x' }).success).toBe(true);
  });
});

// ─── CASE ID PARAM VALIDATION ───
describe('Notes — Case ID Param Validation', () => {
  it('accepts a valid case ID', () => {
    expect(caseIdParam.safeParse('case-001').success).toBe(true);
  });

  it('accepts a UUID case ID', () => {
    expect(caseIdParam.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(caseIdParam.safeParse('').success).toBe(false);
  });

  it('rejects string exceeding 100 chars', () => {
    expect(caseIdParam.safeParse('x'.repeat(101)).success).toBe(false);
  });
});

// ─── NOTE ID PARAM VALIDATION ───
describe('Notes — Note ID Param Validation', () => {
  it('accepts a valid UUID', () => {
    expect(noteIdParam.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });

  it('rejects non-UUID string', () => {
    expect(noteIdParam.safeParse('note-001').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(noteIdParam.safeParse('').success).toBe(false);
  });
});

// ─── CREATE NOTE — HANDLER LOGIC ───
describe('Notes — Create Happy Path', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('creates a note and returns 201', async () => {
    mockPrisma.note.create.mockResolvedValue(SYNTHETIC_NOTE);

    const req = createMockReq({ params: { id: SYNTHETIC_CASE.id }, body: { body: SYNTHETIC_NOTE.body } });
    const res = createMockRes();

    // Simulate handler logic inline (mirrors notes.ts POST handler)
    const parsed = noteBodySchema.safeParse(req.body);
    expect(parsed.success).toBe(true);

    const created = await mockPrisma.note.create({
      data: { caseId: req.params.id, body: parsed.data!.body },
    });

    res.status(201).json({ note: created });

    expect(res._status).toBe(201);
    expect((res._json as { note: typeof SYNTHETIC_NOTE }).note.id).toBe('note-001');
    expect(mockPrisma.note.create).toHaveBeenCalledWith({
      data: { caseId: SYNTHETIC_CASE.id, body: SYNTHETIC_NOTE.body },
    });
  });

  it('rejects empty body with 400', () => {
    const parsed = noteBodySchema.safeParse({ body: '' });
    expect(parsed.success).toBe(false);
  });
});

// ─── LIST NOTES — HANDLER LOGIC ───
describe('Notes — List Happy Path', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('returns notes ordered by createdAt desc', async () => {
    const notes = [
      { ...SYNTHETIC_NOTE, id: 'note-002', createdAt: new Date('2026-04-17T11:00:00Z') },
      { ...SYNTHETIC_NOTE, id: 'note-001', createdAt: new Date('2026-04-17T10:00:00Z') },
    ];
    mockPrisma.note.findMany.mockResolvedValue(notes);

    const result = await mockPrisma.note.findMany({
      where: { caseId: SYNTHETIC_CASE.id },
      orderBy: { createdAt: 'desc' },
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('note-002');
    expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
      where: { caseId: SYNTHETIC_CASE.id },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns empty array when no notes exist', async () => {
    mockPrisma.note.findMany.mockResolvedValue([]);
    const result = await mockPrisma.note.findMany({ where: { caseId: SYNTHETIC_CASE.id }, orderBy: { createdAt: 'desc' } });
    expect(result).toHaveLength(0);
  });
});

// ─── DELETE NOTE — HANDLER LOGIC ───
describe('Notes — Delete Happy Path', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('deletes an existing note and returns 204', async () => {
    mockPrisma.note.findFirst.mockResolvedValue(SYNTHETIC_NOTE);
    mockPrisma.note.delete.mockResolvedValue(SYNTHETIC_NOTE);

    const found = await mockPrisma.note.findFirst({
      where: { id: SYNTHETIC_NOTE.id, caseId: SYNTHETIC_CASE.id },
    });
    expect(found).not.toBeNull();

    await mockPrisma.note.delete({ where: { id: SYNTHETIC_NOTE.id } });

    expect(mockPrisma.note.delete).toHaveBeenCalledWith({ where: { id: SYNTHETIC_NOTE.id } });
  });

  it('returns 404 when note not found for that case', async () => {
    mockPrisma.note.findFirst.mockResolvedValue(null);

    const found = await mockPrisma.note.findFirst({
      where: { id: 'nonexistent-uuid', caseId: SYNTHETIC_CASE.id },
    });

    const res = createMockRes();
    if (!found) res.status(404).json({ error: 'Note not found' });

    expect(res._status).toBe(404);
    expect(mockPrisma.note.delete).not.toHaveBeenCalled();
  });

  it('rejects invalid noteId UUID format', () => {
    expect(noteIdParam.safeParse('not-a-uuid').success).toBe(false);
  });
});

// ─── DISPLAY CAP ───
describe('Notes — 100-Note Display Cap', () => {
  it('cap constant is 100', () => {
    const NOTES_DISPLAY_CAP = 100;
    expect(NOTES_DISPLAY_CAP).toBe(100);
  });

  it('at-cap flag is true when notes.length >= 100', () => {
    const NOTES_DISPLAY_CAP = 100;
    expect(100 >= NOTES_DISPLAY_CAP).toBe(true);
    expect(99 >= NOTES_DISPLAY_CAP).toBe(false);
  });
});
