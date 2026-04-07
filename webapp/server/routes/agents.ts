import { Router, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { runAgent, AgentBroadcast } from '../services/agentRunner.js';
import { getBrainQueries } from '../services/promptLoader.js';
import { maybeProwl, resolveProwl, getProwlStatus } from '../services/prowl.js';

const router = Router();
router.use(authMiddleware);

// Rate limit agent triggers — max 2 per minute per IP (API cost protection)
const agentTriggerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Agent already running for this case. Wait for completion or try again in 60 seconds.' },
});

const validStages = ['intake', 'research', 'drafting', 'qa'] as const;

// SSE connections stored per case
const sseClients = new Map<string, Set<Response>>();

function broadcastToCase(caseId: string, data: AgentBroadcast | object) {
  const clients = sseClients.get(caseId);
  if (clients) {
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach((res) => res.write(msg));
  }
}

const caseIdParam = z.string().min(1).max(100);
const triggerAgentSchema = z.object({
  feedback: z.string().max(2000).optional(),
});
const approveSchema = z.object({
  stage: z.enum(['intake', 'research', 'drafting', 'qa', 'export']),
  action: z.enum(['approve', 'revise', 'reject']),
  notes: z.string().max(2000).optional(),
});

// POST /api/cases/:id/agents/:stage — trigger real Claude agent
router.post('/:id/agents/:stage', agentTriggerLimiter, async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const { id, stage } = req.params;
  const parsed = triggerAgentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const { feedback } = parsed.data;

  if (!validStages.includes(stage as typeof validStages[number])) {
    res.status(400).json({ error: 'Invalid stage' });
    return;
  }

  const jobId = `job_${Date.now()}`;
  const brainQueries = getBrainQueries(stage);
  res.json({ status: 'started', jobId, brainQueries });

  // Run agent asynchronously — streams via SSE
  runAgent(id, stage, broadcastToCase, feedback).catch((err) => {
    console.error(`[agents] Agent run failed for ${stage}:`, err);
    broadcastToCase(id, {
      type: 'error',
      message: `Agent failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      timestamp: new Date().toISOString(),
      stage,
    });
  });
});

// GET /api/cases/:id/agents/stream — SSE endpoint
router.get('/:id/agents/stream', (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const caseId = req.params.id;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE stream connected' })}\n\n`);

  if (!sseClients.has(caseId)) sseClients.set(caseId, new Set());
  sseClients.get(caseId)!.add(res);

  req.on('close', () => {
    sseClients.get(caseId)?.delete(res);
    if (sseClients.get(caseId)?.size === 0) sseClients.delete(caseId);
  });
});

// GET /api/cases/:id/qa — latest QA scorecard from agent_logs.metadata.qa
router.get('/:id/qa', async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const log = await prisma.agentLog.findFirst({
    where: { caseId: req.params.id, stage: 'qa', type: 'complete' },
    orderBy: { createdAt: 'desc' },
  });
  if (!log) {
    res.json({ qa: null, ranAt: null });
    return;
  }
  const metadata = (log.metadata ?? null) as Record<string, unknown> | null;
  const qa = metadata && typeof metadata === 'object' && 'qa' in metadata ? metadata.qa : null;
  res.json({ qa, ranAt: log.createdAt });
});

// GET /api/cases/:id/prowl — check prowl status for a case
router.get('/:id/prowl', async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const status = getProwlStatus(req.params.id);
  res.json(status);
});

// POST /api/cases/:id/approve — human checkpoint with prowl resolution
router.post('/:id/approve', async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const parsed = approveSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  const { stage, action, notes } = parsed.data;
  const stageOrder = ['intake', 'research', 'drafting', 'qa', 'export', 'complete'];
  const currentIdx = stageOrder.indexOf(stage);

  // ─── Resolve any active prowl for this stage ───
  const specResult = await resolveProwl(req.params.id, stage, action);

  if (action === 'approve' && currentIdx < stageOrder.length - 1) {
    const nextStage = stageOrder[currentIdx + 1];
    await prisma.case.update({ where: { id: req.params.id }, data: { stage: nextStage } });
    await prisma.agentLog.create({
      data: { caseId: req.params.id, stage, type: 'complete', message: `${stage} approved by user — advancing to ${nextStage}` },
    });

    if (specResult.promoted) {
      // Prowl was correct — next stage result is already available
      broadcastToCase(req.params.id, {
        type: 'prowl_promoted',
        message: `${nextStage} pre-computed — prowl saved ${Math.round((specResult.timeSaved || 0) / 1000)}s`,
        stage: nextStage,
      });
      await prisma.agentLog.create({
        data: {
          caseId: req.params.id,
          stage: nextStage,
          type: 'complete',
          message: `Prowl ${nextStage} promoted — saved ${Math.round((specResult.timeSaved || 0) / 1000)}s`,
          metadata: { prowl: true, timeSavedMs: specResult.timeSaved },
        },
      });
    }

    broadcastToCase(req.params.id, { type: 'stage_change', message: `Advanced to ${nextStage}`, stage: nextStage });
    res.json({
      nextStage,
      status: 'approved',
      prowl: specResult.promoted ? {
        promoted: true,
        timeSavedMs: specResult.timeSaved,
        message: `${nextStage} was pre-computed and ready`,
      } : undefined,
    });

    // ─── Trigger next prowl (if the promoted stage completed) ───
    // This creates the prowl→promote→prowl→promote chain
    if (!specResult.promoted) {
      // Normal flow: prowl wasn't ready or didn't exist.
      // After the real agent run completes for nextStage, maybeProwl
      // will be called from agentRunner.ts on completion.
    }
    // If promoted, maybeProwl was already called inside resolveProwl()

  } else if (action === 'revise') {
    // Prowl was discarded (if it existed)
    await prisma.agentLog.create({
      data: { caseId: req.params.id, stage, type: 'progress', message: `Revision requested: ${notes || 'No notes provided'}` },
    });
    if (specResult.promoted === false && specResult.timeSaved === undefined) {
      // There was an active prowl that got discarded
      broadcastToCase(req.params.id, {
        type: 'prowl_discarded',
        message: 'Prowl discarded — running with your feedback',
        stage,
      });
    }
    res.json({ nextStage: stage, status: 'revision_requested' });
  } else if (action === 'reject') {
    await prisma.agentLog.create({
      data: { caseId: req.params.id, stage, type: 'error', message: `Stage rejected: ${notes || 'No notes provided'}` },
    });
    res.json({ nextStage: stage, status: 'rejected' });
  } else {
    res.status(400).json({ error: 'Invalid action' });
  }
});

export default router;
