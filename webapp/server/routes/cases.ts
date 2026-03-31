import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// POST /api/cases
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, caseType, reportType, jurisdiction, opposingExpert, deadline } = req.body;
  if (!name) { res.status(400).json({ error: 'Case name required' }); return; }
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
  const c = await prisma.case.findUnique({
    where: { id: req.params.id },
    include: { documents: true, agentLogs: { orderBy: { createdAt: 'desc' }, take: 50 }, report: true },
  });
  if (!c) { res.status(404).json({ error: 'Case not found' }); return; }
  res.json(c);
});

// PATCH /api/cases/:id
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const allowed = ['name', 'caseType', 'reportType', 'jurisdiction', 'opposingExpert', 'deadline', 'stage'];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      data[key] = key === 'deadline' && req.body[key] ? new Date(req.body[key]) : req.body[key];
    }
  }
  const c = await prisma.case.update({ where: { id: req.params.id }, data });
  res.json(c);
});

export default router;
