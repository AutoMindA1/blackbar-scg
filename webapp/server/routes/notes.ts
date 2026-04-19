import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const caseIdParam = z.string().min(1).max(100);
const noteIdParam = z.string().uuid();
const noteBodySchema = z.object({ body: z.string().min(1).max(5000).refine(s => s.trim().length > 0, { message: 'Body cannot be only whitespace' }).transform(s => s.trim()) });

// POST /api/cases/:id/notes
router.post('/:id/notes', async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) {
    res.status(400).json({ error: 'Invalid case ID' });
    return;
  }
  const parsed = noteBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' });
    return;
  }
  const note = await prisma.note.create({
    data: { caseId: req.params.id, body: parsed.data.body },
  });
  res.status(201).json({ note });
});

// GET /api/cases/:id/notes
router.get('/:id/notes', async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) {
    res.status(400).json({ error: 'Invalid case ID' });
    return;
  }
  const notes = await prisma.note.findMany({
    where: { caseId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ notes });
});

// DELETE /api/cases/:id/notes/:noteId
router.delete('/:id/notes/:noteId', async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) {
    res.status(400).json({ error: 'Invalid case ID' });
    return;
  }
  if (!noteIdParam.safeParse(req.params.noteId).success) {
    res.status(400).json({ error: 'Invalid note ID' });
    return;
  }
  const note = await prisma.note.findFirst({
    where: { id: req.params.noteId, caseId: req.params.id },
  });
  if (!note) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }
  await prisma.note.delete({ where: { id: req.params.noteId } });
  res.status(204).send();
});

export default router;
