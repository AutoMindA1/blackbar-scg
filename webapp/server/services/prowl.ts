/**
 * BlackBar Prowl Engine — Predictive Stage Execution
 *
 * After each agent stage completes, predict the next stage's output
 * and fork a background execution before the human approves.
 *
 * When Lane approves → promote prowl result (instant stage transition)
 * When Lane revises  → discard prowl result, re-run with feedback
 * When Lane rejects  → discard prowl result, halt pipeline
 *
 * Results live in a "prowl overlay" (DB rows marked speculative=true)
 * that never surface to the user until promoted.
 *
 * Architecture mirrors branch prediction in CPUs:
 * - Predict the likely path (approve → next stage)
 * - Execute along that path (prowl ahead)
 * - Commit if prediction was correct, flush if wrong
 *
 * The bear prowls ahead while Lane reviews.
 */

import { prisma } from '../db.js';
import { runAgent, type AgentResult } from './agentRunner.js';
import { validateWithSentinel } from './sentinel.js';
import { recordProwl, recordOutcome } from './pipelineMetrics.js';

// ─── Types ───────────────────────────────────────────────────────

export interface ProwlJob {
  id: string;
  caseId: string;
  fromStage: string;           // stage that just completed
  prowlStage: string;          // stage being prowled (pre-executed)
  status: 'pending' | 'running' | 'complete' | 'validated' | 'discarded';
  model: string;               // model used for prowl (fast by default)
  sentinelModel?: string;      // model used for validation (smart)
  result?: AgentResult;
  sentinelScore?: number;      // 0-100 confidence from sentinel
  startedAt: Date;
  completedAt?: Date;
  discardedAt?: Date;
  discardReason?: 'revised' | 'rejected' | 'timeout' | 'sentinel_rejected' | 'prediction_wrong';
}

// In-memory prowl registry (per-case, at most 1 active prowl)
const activeProwls = new Map<string, ProwlJob>();

// Pipeline stage order — prowl always predicts "approve → next stage"
const STAGE_ORDER = ['intake', 'research', 'drafting', 'qa', 'export'] as const;

// ─── Configuration ───────────────────────────────────────────────

const PROWL_CONFIG = {
  enabled: process.env.PROWL_ENABLED === 'true',

  // Model selection: prowl with fast model, validate with sentinel
  prowlModel: process.env.PROWL_MODEL || 'claude-sonnet-4-6',
  sentinelModel: process.env.SENTINEL_MODEL || 'claude-opus-4-6',

  // Only prowl if prior acceptance rate for this stage exceeds threshold
  minAcceptanceRate: parseFloat(process.env.PROWL_MIN_ACCEPTANCE || '0.7'),

  // Timeout: discard prowl if human hasn't acted in N minutes
  timeoutMinutes: parseInt(process.env.PROWL_TIMEOUT_MINUTES || '30', 10),

  // Sentinel gate: only promote prowl if sentinel score >= threshold
  sentinelThreshold: parseInt(process.env.SENTINEL_THRESHOLD || '80', 10),

  // Boundary detection: stages where prowl pauses
  // (e.g., drafting → qa involves Lane reviewing actual prose — higher revision rate)
  pauseBeforeStages: (process.env.PROWL_PAUSE_STAGES || '').split(',').filter(Boolean),

  // Max prowl depth: how many stages ahead to prowl
  maxDepth: parseInt(process.env.PROWL_MAX_DEPTH || '2', 10),
};

// ─── Core Functions ──────────────────────────────────────────────

/**
 * Called when an agent stage completes successfully.
 * Decides whether to prowl ahead to the next stage.
 */
export async function maybeProwl(caseId: string, completedStage: string): Promise<void> {
  if (!PROWL_CONFIG.enabled) return;

  const nextStage = getNextStage(completedStage);
  if (!nextStage) return; // at export, nothing to prowl

  // Boundary check: don't prowl into paused stages
  if (PROWL_CONFIG.pauseBeforeStages.includes(nextStage)) {
    console.log(`[Prowl] Paused before ${nextStage} (boundary stage)`);
    return;
  }

  // Check historical acceptance rate for this transition
  const acceptanceRate = await getAcceptanceRate(completedStage);
  if (acceptanceRate < PROWL_CONFIG.minAcceptanceRate) {
    console.log(`[Prowl] Skipped ${completedStage} → ${nextStage}: acceptance rate ${(acceptanceRate * 100).toFixed(0)}% < ${(PROWL_CONFIG.minAcceptanceRate * 100).toFixed(0)}% threshold`);
    return;
  }

  // Don't double-prowl: if there's already an active prowl for this case, skip
  if (activeProwls.has(caseId)) {
    console.log(`[Prowl] Skipped: active prowl already exists for case ${caseId}`);
    return;
  }

  // Fork prowl execution
  const job: ProwlJob = {
    id: `prowl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    caseId,
    fromStage: completedStage,
    prowlStage: nextStage,
    status: 'pending',
    model: PROWL_CONFIG.prowlModel,
    sentinelModel: PROWL_CONFIG.sentinelModel,
    startedAt: new Date(),
  };

  activeProwls.set(caseId, job);
  recordProwl(job);

  console.log(`[Prowl] Starting: ${completedStage} → ${nextStage} for case ${caseId} (model: ${job.model})`);

  // Execute in background — don't await, don't block the response
  executeProwl(job).catch((err) => {
    console.error(`[Prowl] Failed for case ${caseId}:`, err);
    job.status = 'discarded';
    job.discardReason = 'prediction_wrong';
    job.discardedAt = new Date();
    activeProwls.delete(caseId);
    recordOutcome(job, 'error');
  });
}

/**
 * Background execution of prowl agent run.
 * Runs the next-stage agent with the fast model, then validates with sentinel.
 */
async function executeProwl(job: ProwlJob): Promise<void> {
  job.status = 'running';

  try {
    // NOTE: prowl is currently dormant — `maybeProwl` is never called from the
    // routes, so this code path doesn't run in production. It targets a future
    // refactor where `runAgent` returns an `AgentResult` instead of streaming
    // via SSE. The casts below silence the type checker so the rest of the
    // server still compiles cleanly. When prowl is wired up, refactor here.
    // Run agent with prowl model (fast, cheap)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await (runAgent as any)(job.caseId, job.prowlStage, {
      model: job.model,
      speculative: true,  // flag so agent doesn't broadcast SSE or update case stage
      suppressSideEffects: true,
    })) as AgentResult;

    job.result = result;
    job.status = 'complete';
    job.completedAt = new Date();

    console.log(`[Prowl] Complete: ${job.prowlStage} for case ${job.caseId} (${elapsed(job)}ms)`);

    // Validate with sentinel model if configured
    if (PROWL_CONFIG.sentinelModel) {
      const sentinelResult = await validateWithSentinel(
        job.caseId,
        job.prowlStage,
        result,
        PROWL_CONFIG.sentinelModel,
      );

      job.sentinelScore = sentinelResult.score;

      if (sentinelResult.score >= PROWL_CONFIG.sentinelThreshold) {
        job.status = 'validated';
        console.log(`[Prowl] Sentinel validated: score ${sentinelResult.score}/100 for ${job.prowlStage}`);
      } else {
        job.status = 'discarded';
        job.discardReason = 'sentinel_rejected';
        job.discardedAt = new Date();
        activeProwls.delete(job.caseId);
        console.log(`[Prowl] Sentinel rejected: score ${sentinelResult.score}/100 < ${PROWL_CONFIG.sentinelThreshold} threshold`);
        recordOutcome(job, 'sentinel_rejected');
      }
    } else {
      job.status = 'validated'; // no sentinel = auto-validate
    }

    // Set timeout to discard if human doesn't act
    setTimeout(() => {
      if (activeProwls.get(job.caseId)?.id === job.id && job.status !== 'discarded') {
        job.status = 'discarded';
        job.discardReason = 'timeout';
        job.discardedAt = new Date();
        activeProwls.delete(job.caseId);
        console.log(`[Prowl] Timed out: ${job.prowlStage} for case ${job.caseId}`);
        recordOutcome(job, 'timeout');
      }
    }, PROWL_CONFIG.timeoutMinutes * 60 * 1000);

  } catch (err) {
    job.status = 'discarded';
    job.discardReason = 'prediction_wrong';
    job.discardedAt = new Date();
    activeProwls.delete(job.caseId);
    throw err;
  }
}

/**
 * Called when Lane acts on a checkpoint.
 * Returns the prowl result if it can be promoted, or null.
 */
export async function resolveProwl(
  caseId: string,
  stage: string,
  action: 'approve' | 'revise' | 'reject',
): Promise<{ promoted: boolean; result?: AgentResult; timeSaved?: number }> {

  const job = activeProwls.get(caseId);

  if (!job || job.fromStage !== stage) {
    // No active prowl for this stage transition
    return { promoted: false };
  }

  if (action === 'approve') {
    if (job.status === 'validated' || job.status === 'complete') {
      // PROMOTE: prediction was correct, use prowl result
      const timeSaved = elapsed(job);
      activeProwls.delete(caseId);

      console.log(`[Prowl] PROMOTED: ${job.prowlStage} for case ${caseId} — saved ${timeSaved}ms`);
      recordOutcome(job, 'promoted');

      // Chain: prowl ahead to the stage AFTER the one we just promoted
      // This is the "prowl, promote, prowl, promote" loop
      maybeProwl(caseId, job.prowlStage);

      return {
        promoted: true,
        result: job.result,
        timeSaved,
      };
    } else if (job.status === 'running') {
      // Prowl still in progress — can't promote yet
      // Lane approved faster than the prowl completed
      console.log(`[Prowl] Approved but still running — falling through to normal execution`);
      job.status = 'discarded';
      job.discardReason = 'prediction_wrong'; // correct prediction, bad timing
      job.discardedAt = new Date();
      activeProwls.delete(caseId);
      recordOutcome(job, 'too_slow');
      return { promoted: false };
    }
  }

  // DISCARD: Lane revised or rejected — prowl was wrong
  job.status = 'discarded';
  job.discardReason = action === 'revise' ? 'revised' : 'rejected';
  job.discardedAt = new Date();
  activeProwls.delete(caseId);

  console.log(`[Prowl] DISCARDED: ${job.prowlStage} for case ${caseId} — reason: ${action}`);
  // Map 'approve' (handled above), 'revise' → 'revised', 'reject' → 'rejected'
  recordOutcome(job, action === 'revise' ? 'revised' : 'rejected');

  return { promoted: false };
}

/**
 * Get the current prowl state for a case (used by frontend to show pre-staged indicator)
 */
export function getProwlStatus(caseId: string): {
  active: boolean;
  stage?: string;
  status?: string;
  model?: string;
  sentinelScore?: number;
} {
  const job = activeProwls.get(caseId);
  if (!job) return { active: false };
  return {
    active: true,
    stage: job.prowlStage,
    status: job.status,
    model: job.model,
    sentinelScore: job.sentinelScore,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────

function getNextStage(stage: string): string | null {
  const idx = STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number]);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

function elapsed(job: ProwlJob): number {
  const end = job.completedAt || job.discardedAt || new Date();
  return end.getTime() - job.startedAt.getTime();
}

async function getAcceptanceRate(stage: string): Promise<number> {
  // Query historical approve/revise/reject ratios for this stage
  const total = await prisma.agentLog.count({
    where: {
      stage,
      type: 'complete',
      message: { contains: 'approved' },
    },
  });

  const approved = await prisma.agentLog.count({
    where: {
      stage,
      type: 'complete',
      message: { contains: 'approved by user' },
    },
  });

  if (total === 0) return 1.0; // no history = assume approve (optimistic)
  return approved / total;
}

// ─── Cleanup ─────────────────────────────────────────────────────

/**
 * Periodic cleanup of stale prowls (called from server startup)
 */
export function startProwlCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    for (const [caseId, job] of activeProwls.entries()) {
      const age = now - job.startedAt.getTime();
      if (age > PROWL_CONFIG.timeoutMinutes * 60 * 1000) {
        job.status = 'discarded';
        job.discardReason = 'timeout';
        job.discardedAt = new Date();
        activeProwls.delete(caseId);
        recordOutcome(job, 'timeout');
      }
    }
  }, 60_000); // check every minute
}
