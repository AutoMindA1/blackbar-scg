import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const validStages = ['intake', 'research', 'drafting', 'qa'] as const;

// Brain section mapping per agent stage
const BRAIN_QUERIES: Record<string, string[]> = {
  intake: ['§3 Case Taxonomy', '§4 Report Types', '§8 Code Citation', '§2 Personnel'],
  research: ['§6 Attack Patterns', '§8 Standards & Codes', '§10 Known Adversary', '§9 Instruments'],
  drafting: ['§5 Voice Rules', '§7 Standard Blocks', '§4 Report Structure', '§12 Format Rules'],
  qa: ['§11 Benchmark Cases', '§5 Prohibited Terms', '§5 Identity/Date', '§12 Format Rules'],
};

// Mock SSE messages per stage
const MOCK_STREAMS: Record<string, Array<{ type: string; message: string; delay: number; metadata?: Record<string, unknown> }>> = {
  intake: [
    { type: 'progress', message: 'Loading ENTERPRISE_BRAIN.md — querying §3 Case Taxonomy...', delay: 400 },
    { type: 'progress', message: 'Classifying case type from uploaded documents...', delay: 800 },
    { type: 'progress', message: 'Case classified: slip_fall — Clark County jurisdiction confirmed', delay: 600 },
    { type: 'progress', message: 'Querying §4 Report Types — determining report structure...', delay: 500 },
    { type: 'progress', message: 'Report type: initial — standard 7-section sequence applies', delay: 400 },
    { type: 'progress', message: 'Querying §2 Personnel — confirming Lane + Mariz credentials for slip case', delay: 600 },
    { type: 'finding', message: 'Opposing expert identified: John Peterson (Retail Litigation Consultants) — known adversary per Brain §10', delay: 700, metadata: { confidence: 0.92 } },
    { type: 'progress', message: 'Extracting key dates — European format per Brain §5: 2 February 2026', delay: 500 },
    { type: 'complete', message: 'Intake complete — case classified, jurisdiction confirmed, opposing expert flagged', delay: 300 },
  ],
  research: [
    { type: 'progress', message: 'Loading ENTERPRISE_BRAIN.md — querying §6 Attack Patterns...', delay: 400 },
    { type: 'progress', message: 'Scanning opposing expert report for rebuttal vectors...', delay: 900 },
    { type: 'finding', message: 'ATK-01 matched: Credential attack — Peterson CXLT expired per registry check', delay: 800, metadata: { attackPattern: 'ATK-01', confidence: 0.95 } },
    { type: 'finding', message: 'ATK-07 matched: Omission attack — no site visit, no tribometer testing, no footwear analysis', delay: 700, metadata: { attackPattern: 'ATK-07', confidence: 0.98 } },
    { type: 'progress', message: 'Querying §8 Standards & Codes — ANSI A326.3, NFSI B101.1, NFSI B101.3', delay: 600 },
    { type: 'finding', message: 'ATK-08 matched: Instrumentation defense — BOT-3000E is only device named in ANSI A326.3', delay: 700, metadata: { attackPattern: 'ATK-08', confidence: 0.90 } },
    { type: 'progress', message: 'Querying §10 Known Adversary — deploying Peterson playbook', delay: 500 },
    { type: 'finding', message: 'Peterson uses NFSI-only framing — counter with multi-body framework per Brain §10', delay: 600, metadata: { attackPattern: 'ATK-05', confidence: 0.88 } },
    { type: 'complete', message: 'Research complete — 4 attack patterns identified, 12 citations catalogued', delay: 300 },
  ],
  drafting: [
    { type: 'progress', message: 'Loading ENTERPRISE_BRAIN.md — querying §5 Voice Rules...', delay: 400 },
    { type: 'progress', message: 'Applying entity voice: SCG speaks, not "I" — per Brain §5', delay: 600 },
    { type: 'progress', message: 'Inserting BLK-QA: Qualifications block (Lane + Mariz)...', delay: 700 },
    { type: 'progress', message: 'Building Documentation Reviewed section — semicolons per item, period on final', delay: 500 },
    { type: 'progress', message: 'Inserting BLK-01: Slip case multi-factor opener...', delay: 600 },
    { type: 'progress', message: 'Querying §7 — inserting BLK-02: English XL VIT reliability block...', delay: 700 },
    { type: 'progress', message: 'Inserting BLK-09: ANSI A326.3 defense block...', delay: 600 },
    { type: 'progress', message: 'Drafting Points of Opinion — certainty language per Brain §5...', delay: 800 },
    { type: 'progress', message: 'Inserting BLK-CL: Conclusion boilerplate...', delay: 400 },
    { type: 'complete', message: 'Draft complete — 7 sections, 4 standard blocks inserted, entity voice maintained', delay: 300 },
  ],
  qa: [
    { type: 'progress', message: 'Loading ENTERPRISE_BRAIN.md — querying §5 Prohibited Terms...', delay: 400 },
    { type: 'progress', message: 'Scanning for prohibited terms: "negligent", "prior to", "I", "victim", "dangerous condition"...', delay: 800 },
    { type: 'finding', message: 'QA flagged: "prior to" found in §4 paragraph 2 — replace with "before" per Brain §5', delay: 600, metadata: { severity: 'warning', location: 'section-4-p2' } },
    { type: 'progress', message: 'Checking entity voice consistency — no unauthorized "I" in body text...', delay: 700 },
    { type: 'progress', message: 'Verifying European date format per Brain §5: all dates pass', delay: 500 },
    { type: 'progress', message: 'Querying §12 Format Rules — underlined headers, figure captions, footnotes...', delay: 600 },
    { type: 'progress', message: 'Running benchmark test per Brain §11: "Does this read like Gleason, Heagy, or Anderson?"', delay: 800 },
    { type: 'finding', message: 'Benchmark comparison: closest match is Gleason (Initial Report, 2 Feb 2026) — 94% similarity', delay: 600, metadata: { benchmark: 'BM-GL', score: 94 } },
    { type: 'complete', message: 'QA complete — score: 94/100, 1 warning (prohibited term), 0 critical issues', delay: 300 },
  ],
};

// SSE connections stored per case
const sseClients = new Map<string, Set<Response>>();

function broadcastToCase(caseId: string, data: object) {
  const clients = sseClients.get(caseId);
  if (clients) {
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach((res) => res.write(msg));
  }
}

const uuidParam = z.string().uuid();
const triggerAgentSchema = z.object({
  feedback: z.string().max(2000).optional(),
});
const approveSchema = z.object({
  stage: z.enum(['intake', 'research', 'drafting', 'qa', 'export']),
  action: z.enum(['approve', 'revise', 'reject']),
  notes: z.string().max(2000).optional(),
});

// POST /api/cases/:id/agents/:stage — trigger mock agent
router.post('/:id/agents/:stage', async (req: AuthRequest, res: Response) => {
  if (!uuidParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const { id, stage } = req.params;
  const parsed = triggerAgentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const { feedback } = parsed.data;
  const messages = MOCK_STREAMS[stage];
  if (!messages) { res.status(400).json({ error: 'Invalid stage' }); return; }

  const jobId = `job_${Date.now()}`;
  res.json({ status: 'started', jobId, brainQueries: BRAIN_QUERIES[stage] });

  // Stream mock messages asynchronously
  let elapsed = 0;
  for (const msg of messages) {
    elapsed += msg.delay;
    setTimeout(async () => {
      const logEntry = {
        type: msg.type,
        message: feedback && msg.type === 'progress' ? `[With feedback] ${msg.message}` : msg.message,
        timestamp: new Date().toISOString(),
        metadata: msg.metadata,
        stage,
      };
      broadcastToCase(id, logEntry);
      await prisma.agentLog.create({
        data: { caseId: id, stage, type: msg.type, message: msg.message, metadata: msg.metadata || undefined },
      }).catch(() => {});
    }, elapsed);
  }
});

// GET /api/cases/:id/agents/stream — SSE endpoint
router.get('/:id/agents/stream', (req: AuthRequest, res: Response) => {
  if (!uuidParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
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

// POST /api/cases/:id/approve — human checkpoint
router.post('/:id/approve', async (req: AuthRequest, res: Response) => {
  if (!uuidParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const parsed = approveSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  const { stage, action, notes } = parsed.data;
  const stageOrder = ['intake', 'research', 'drafting', 'qa', 'export', 'complete'];
  const currentIdx = stageOrder.indexOf(stage);

  if (action === 'approve' && currentIdx < stageOrder.length - 1) {
    const nextStage = stageOrder[currentIdx + 1];
    await prisma.case.update({ where: { id: req.params.id }, data: { stage: nextStage } });
    await prisma.agentLog.create({
      data: { caseId: req.params.id, stage, type: 'complete', message: `${stage} approved by user — advancing to ${nextStage}` },
    });
    broadcastToCase(req.params.id, { type: 'stage_change', message: `Advanced to ${nextStage}`, stage: nextStage });
    res.json({ nextStage, status: 'approved' });
  } else if (action === 'revise') {
    await prisma.agentLog.create({
      data: { caseId: req.params.id, stage, type: 'progress', message: `Revision requested: ${notes || 'No notes provided'}` },
    });
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
