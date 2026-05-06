/**
 * BlackBar v2 Pipeline — Express Routes
 *
 * REST endpoints for the new DAG-based pipeline orchestrator.
 * All routes require auth. State is managed by the orchestrator;
 * these routes provide the HTTP surface for:
 *
 *   POST /api/pipeline/:caseId/start    — Initialize pipeline for a case
 *   GET  /api/pipeline/:caseId/state    — Return current CaseState
 *   POST /api/pipeline/:caseId/approve  — Lane Gate (human approval)
 *   POST /api/pipeline/:caseId/override — Admin override (force phase)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { prisma } from '../db.js';
import {
  getOrCreateState,
  persistState,
  evaluateTransition,
  advancePhase,
  approveGate,
} from '../services/orchestrator.js';
import type { PipelinePhase } from '../types/caseState.js';

const router = Router();
router.use(authMiddleware);

// ─── Validation Schemas ─────────────────────────────────────────

const caseIdParam = z.string().min(1).max(100);

const approveBodySchema = z.object({
  gate: z.enum(['research', 'review']),
});

const VALID_PHASES: PipelinePhase[] = [
  'created',
  'ingestion',
  'intake',
  'research',
  'pending_research_approval',
  'drafting',
  'qa',
  'pending_review',
  'export',
  'complete',
  'failed',
];

const overrideBodySchema = z.object({
  phase: z.enum(VALID_PHASES as [string, ...string[]]),
  reason: z.string().min(1).max(500),
});

// ─── POST /api/pipeline/:caseId/start ───────────────────────────

/**
 * Initialize the pipeline for a case.
 * Creates a fresh CaseState at 'created', then auto-advances to 'ingestion'.
 * Populates the document list from existing case documents.
 */
router.post('/:caseId/start', async (req: AuthRequest, res: Response) => {
  const paramCheck = caseIdParam.safeParse(req.params.caseId);
  if (!paramCheck.success) {
    res.status(400).json({ error: 'Invalid case ID' });
    return;
  }

  const caseId = req.params.caseId;

  try {
    // Verify the case exists
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      include: { documents: true },
    });

    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    // Create fresh state
    let state = await getOrCreateState(caseId);

    // Populate documents from the case
    state.documents = caseRecord.documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      mimeType: null, // MIME type not tracked in current schema
      extractionStatus: doc.extractedText ? 'ready' as const : 'pending' as const,
      pageCount: doc.pageCount,
      hasContent: !!doc.extractedText,
    }));

    // Set start time
    state.metadata.startedAt = new Date().toISOString();

    // Auto-advance from 'created' to 'ingestion'
    if (state.phase === 'created') {
      state = advancePhase(state, 'auto', 'Pipeline initialized — advancing to ingestion');
    }

    await persistState(state);

    console.log(`[pipeline] Started pipeline for case ${caseId} — phase: ${state.phase}`);

    res.json({ state });
  } catch (err) {
    console.error(`[pipeline] Failed to start pipeline for case ${caseId}:`, err);
    res.status(500).json({
      error: 'Failed to initialize pipeline',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// ─── GET /api/pipeline/:caseId/state ────────────────────────────

/**
 * Return the current CaseState for a case.
 * If no pipeline has been started, returns a fresh 'created' state.
 */
router.get('/:caseId/state', async (req: AuthRequest, res: Response) => {
  const paramCheck = caseIdParam.safeParse(req.params.caseId);
  if (!paramCheck.success) {
    res.status(400).json({ error: 'Invalid case ID' });
    return;
  }

  const caseId = req.params.caseId;

  try {
    const state = await getOrCreateState(caseId);

    // Also include the transition evaluation so the UI knows what's next
    const transition = evaluateTransition(state);

    res.json({ state, transition });
  } catch (err) {
    console.error(`[pipeline] Failed to get state for case ${caseId}:`, err);
    res.status(500).json({
      error: 'Failed to load pipeline state',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// ─── POST /api/pipeline/:caseId/approve ─────────────────────────

/**
 * Human approval endpoint — the Lane Gate.
 * Advances the case past a human checkpoint:
 *   - gate='research': pending_research_approval → drafting
 *   - gate='review': pending_review → export
 */
router.post('/:caseId/approve', async (req: AuthRequest, res: Response) => {
  const paramCheck = caseIdParam.safeParse(req.params.caseId);
  if (!paramCheck.success) {
    res.status(400).json({ error: 'Invalid case ID' });
    return;
  }

  const bodyCheck = approveBodySchema.safeParse(req.body);
  if (!bodyCheck.success) {
    res.status(400).json({
      error: 'Invalid request body',
      details: bodyCheck.error.flatten(),
    });
    return;
  }

  const caseId = req.params.caseId;
  const { gate } = bodyCheck.data;

  try {
    const expectedPhase = gate === 'research' ? 'pending_research_approval' : 'pending_review';
    const preState = await getOrCreateState(caseId);
    if (preState.phase !== expectedPhase) {
      res.status(409).json({
        error: `Case is at '${preState.phase}', not '${expectedPhase}' — cannot approve ${gate} gate`,
        currentPhase: preState.phase,
      });
      return;
    }

    const state = await approveGate(caseId, gate);

    // Log the approval action
    await prisma.agentLog.create({
      data: {
        caseId,
        stage: state.phase,
        type: 'human_approval',
        message: `${gate} gate approved by user ${req.userId ?? 'unknown'}`,
      },
    });

    console.log(`[pipeline] Gate '${gate}' approved for case ${caseId} — now at phase: ${state.phase}`);

    // Include transition evaluation for the new phase
    const transition = evaluateTransition(state);

    res.json({ state, transition });
  } catch (err) {
    console.error(`[pipeline] Failed to approve gate for case ${caseId}:`, err);
    res.status(500).json({
      error: 'Failed to process approval',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// ─── POST /api/pipeline/:caseId/override ────────────────────────

/**
 * Admin override to force a phase transition.
 * Only users with the 'admin' role can use this endpoint.
 * Records the override in both the CaseState history and AgentLog.
 */
router.post('/:caseId/override', async (req: AuthRequest, res: Response) => {
  const paramCheck = caseIdParam.safeParse(req.params.caseId);
  if (!paramCheck.success) {
    res.status(400).json({ error: 'Invalid case ID' });
    return;
  }

  const bodyCheck = overrideBodySchema.safeParse(req.body);
  if (!bodyCheck.success) {
    res.status(400).json({
      error: 'Invalid request body',
      details: bodyCheck.error.flatten(),
    });
    return;
  }

  const caseId = req.params.caseId;
  const { phase, reason } = bodyCheck.data;

  try {
    // Check user role — only admins can override
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin role required for pipeline overrides' });
      return;
    }

    const state = await getOrCreateState(caseId);
    const previousPhase = state.phase;

    // Record the override transition
    state.history.push({
      from: previousPhase,
      to: phase as PipelinePhase,
      timestamp: new Date().toISOString(),
      trigger: 'human',
      reason: `Admin override: ${reason}`,
    });

    state.phase = phase as PipelinePhase;

    // Mark completion if forced to complete
    if (phase === 'complete' && !state.metadata.completedAt) {
      state.metadata.completedAt = new Date().toISOString();
    }

    await persistState(state);

    // Log the override action
    await prisma.agentLog.create({
      data: {
        caseId,
        stage: phase,
        type: 'admin_override',
        message: `Admin override: ${previousPhase} → ${phase} — ${reason} (by user ${req.userId})`,
      },
    });

    console.log(
      `[pipeline] Admin override for case ${caseId}: ${previousPhase} → ${phase} — ${reason}`,
    );

    const transition = evaluateTransition(state);

    res.json({ state, transition, overridden: true, previousPhase });
  } catch (err) {
    console.error(`[pipeline] Failed to override phase for case ${caseId}:`, err);
    res.status(500).json({
      error: 'Failed to process override',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

export default router;
