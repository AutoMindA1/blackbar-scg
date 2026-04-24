import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const createCaseSchema = z.object({
  name: z.string().trim().min(1).max(500),
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

// POST /api/cases
router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = createCaseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  const { name, caseType, reportType, jurisdiction, opposingExpert, deadline } = parsed.data;
  const c = await prisma.case.create({
    data: {
      name,
      caseType: caseType || null,
      reportType: reportType || null,
      jurisdiction: jurisdiction || null,
      opposingExpert: opposingExpert || null,
      deadline: deadline ? new Date(deadline) : null,
      createdBy: req.userId!,
    },
  });
  res.status(201).json(c);
});

// GET /api/cases
router.get('/', async (_req: AuthRequest, res: Response) => {
  const cases = await prisma.case.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { documents: true } } },
  });
  res.json({
    cases: cases.map((c) => ({
      id: c.id,
      name: c.name,
      caseType: c.caseType,
      reportType: c.reportType,
      stage: c.stage,
      jurisdiction: c.jurisdiction,
      opposingExpert: c.opposingExpert,
      documentCount: c._count.documents,
      lastActivity: c.updatedAt,
      createdAt: c.createdAt,
    })),
  });
});

// GET /api/cases/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const c = await prisma.case.findUnique({
    where: { id: req.params.id },
    include: { documents: true, agentLogs: { orderBy: { createdAt: 'desc' }, take: 50 }, report: true },
  });
  if (!c) { res.status(404).json({ error: 'Case not found' }); return; }
  res.json(c);
});

// PATCH /api/cases/:id
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const parsed = updateCaseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  const data: Record<string, unknown> = { ...parsed.data };
  if (data.deadline) data.deadline = new Date(data.deadline as string);
  const c = await prisma.case.update({ where: { id: req.params.id }, data });
  res.json(c);
});

export default router;
