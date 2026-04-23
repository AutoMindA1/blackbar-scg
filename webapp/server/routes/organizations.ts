import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const VALID_ENTITY_TYPES = ['swainston_ai', 'tactical_resources', 'digital_imaging', 'client'] as const;

const createOrgSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  entityType: z.enum(VALID_ENTITY_TYPES).optional(),
  billingEmail: z.string().email().max(255).optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member', 'viewer', 'billing']).default('member'),
});

// GET /api/organizations — list orgs the current user belongs to
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: req.userId },
      include: { org: true },
    });
    res.json({ organizations: memberships.map((m) => ({ ...m.org, role: m.role })) });
  } catch {
    res.json({ organizations: [] });
  }
});

// POST /api/organizations — create org (admin only)
router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = createOrgSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const org = await prisma.organization.create({
      data: {
        ...parsed.data,
        entityType: parsed.data.entityType || null,
        billingEmail: parsed.data.billingEmail || null,
      },
    });

    await prisma.organizationMember.create({
      data: { orgId: org.id, userId: req.userId!, role: 'admin' },
    });

    res.status(201).json(org);
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      res.status(409).json({ error: 'Organization slug already exists' });
      return;
    }
    throw err;
  }
});

// GET /api/organizations/:id — get org details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const member = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: req.params.id, userId: req.userId! } },
    });
    if (!member) {
      res.status(403).json({ error: 'Not a member of this organization' });
      return;
    }

    const org = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        _count: { select: { cases: true } },
      },
    });
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    res.json({ ...org, caseCount: org._count.cases });
  } catch {
    res.status(404).json({ error: 'Organization not found' });
  }
});

// POST /api/organizations/:id/members — add member (admin only)
router.post('/:id/members', async (req: AuthRequest, res: Response) => {
  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const requester = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: req.params.id, userId: req.userId! } },
    });
    if (!requester || requester.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const member = await prisma.organizationMember.create({
      data: { orgId: req.params.id, userId: parsed.data.userId, role: parsed.data.role },
    });
    res.status(201).json(member);
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      res.status(409).json({ error: 'User is already a member' });
      return;
    }
    throw err;
  }
});

// GET /api/organizations/:id/usage — usage summary for billing separation
router.get('/:id/usage', async (req: AuthRequest, res: Response) => {
  try {
    const member = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: req.params.id, userId: req.userId! } },
    });
    if (!member || !['admin', 'billing'].includes(member.role)) {
      res.status(403).json({ error: 'Admin or billing access required' });
      return;
    }

    const startDate = req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end ? new Date(req.query.end as string) : new Date();

    const records = await prisma.usageRecord.findMany({
      where: { orgId: req.params.id, createdAt: { gte: startDate, lte: endDate } },
    });

    const summary = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostCents: 0,
      byModel: {} as Record<string, { inputTokens: number; outputTokens: number; costCents: number }>,
      byStage: {} as Record<string, { inputTokens: number; outputTokens: number; costCents: number }>,
      recordCount: records.length,
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
    };

    for (const r of records) {
      summary.totalInputTokens += r.inputTokens;
      summary.totalOutputTokens += r.outputTokens;
      summary.totalCostCents += r.costCents;

      if (!summary.byModel[r.model]) summary.byModel[r.model] = { inputTokens: 0, outputTokens: 0, costCents: 0 };
      summary.byModel[r.model].inputTokens += r.inputTokens;
      summary.byModel[r.model].outputTokens += r.outputTokens;
      summary.byModel[r.model].costCents += r.costCents;

      if (r.stage) {
        if (!summary.byStage[r.stage]) summary.byStage[r.stage] = { inputTokens: 0, outputTokens: 0, costCents: 0 };
        summary.byStage[r.stage].inputTokens += r.inputTokens;
        summary.byStage[r.stage].outputTokens += r.outputTokens;
        summary.byStage[r.stage].costCents += r.costCents;
      }
    }

    res.json(summary);
  } catch {
    res.json({ totalInputTokens: 0, totalOutputTokens: 0, totalCostCents: 0, byModel: {}, byStage: {}, recordCount: 0 });
  }
});

export default router;
