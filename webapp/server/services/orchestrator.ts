/**
 * BlackBar v2 Pipeline — DAG Orchestrator & CaseState Manager
 *
 * Manages pipeline state transitions for forensic report cases. The orchestrator
 * owns the DAG (directed acyclic graph) that defines legal phase transitions,
 * evaluates whether a case should advance, and persists the full CaseState
 * snapshot to AgentLog rows.
 *
 * Important: the orchestrator does NOT call agentRunner directly. It manages
 * state and transitions only. Agent execution is triggered by the existing
 * routes or the pipeline route, which reads orchestrator state to decide
 * what to run next.
 *
 * Persistence: CaseState is stored as AgentLog rows with type='pipeline_state'
 * and the full CaseState object as the metadata JSON column.
 *
 * DAG:
 *   created → ingestion (auto)
 *   ingestion → intake (auto, when all documents normalized)
 *   intake → research (auto, confidence >= 0.80)
 *   research → pending_research_approval (always — Lane Gate)
 *   pending_research_approval → drafting (human approval only)
 *   drafting → qa (auto, always)
 *   qa → drafting (auto, if qa score < 85, max 2 iterations)
 *   qa → pending_review (auto, if qa score >= 85)
 *   pending_review → export (human approval only)
 *   export → complete (auto)
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '../db.js';
import type {
  CaseState,
  PipelinePhase,
  DAGEdge,
  StateTransition,
} from '../types/caseState.js';
import { createInitialState } from '../types/caseState.js';
import { routeModel, getComplexityFlags, estimateCostCents } from './modelRouter.js';
import type {
  PatternCConfig,
  PatternCInput,
  PatternCOverride,
  PatternCResult,
  PatternCTrigger,
} from '../types/patternC.js';

// ─── DAG Definition ─────────────────────────────────────────────

export const DAG_EDGES: DAGEdge[] = [
  { from: 'created',                    to: 'ingestion',                  condition: 'auto' },
  { from: 'ingestion',                  to: 'intake',                     condition: 'auto' },
  { from: 'intake',                     to: 'research',                   condition: 'threshold', threshold: 0.80 },
  { from: 'research',                   to: 'pending_research_approval',  condition: 'auto' },
  { from: 'pending_research_approval',  to: 'drafting',                   condition: 'human' },
  { from: 'drafting',                   to: 'qa',                         condition: 'auto' },
  { from: 'qa',                         to: 'drafting',                   condition: 'threshold', threshold: 85, maxIterations: 2 },
  { from: 'qa',                         to: 'pending_review',             condition: 'auto' },
  { from: 'pending_review',             to: 'export',                     condition: 'human' },
  { from: 'export',                     to: 'complete',                   condition: 'auto' },
];

// ─── State Persistence ──────────────────────────────────────────

/**
 * Load existing CaseState from the most recent pipeline_state AgentLog,
 * or create a fresh one if none exists.
 */
export async function getOrCreateState(caseId: string): Promise<CaseState> {
  const existing = await prisma.agentLog.findFirst({
    where: { caseId, type: 'pipeline_state' },
    orderBy: { createdAt: 'desc' },
  });

  if (existing?.metadata) {
    const meta = existing.metadata as Record<string, unknown>;
    // Validate it looks like a CaseState
    if (meta.caseId && meta.phase && meta.history) {
      console.log(`[orchestrator] Loaded CaseState for ${caseId} — phase: ${meta.phase}`);
      return meta as unknown as CaseState;
    }
  }

  console.log(`[orchestrator] No existing CaseState for ${caseId} — creating fresh`);
  const fresh = createInitialState(caseId);
  await persistState(fresh);
  return fresh;
}

/**
 * Persist the full CaseState snapshot as an AgentLog row.
 * Each persist creates a new row — the history is append-only.
 */
export async function persistState(state: CaseState): Promise<void> {
  await prisma.agentLog.create({
    data: {
      caseId: state.caseId,
      stage: state.phase,
      type: 'pipeline_state',
      message: `Pipeline state: ${state.phase}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: state as any,
    },
  });
  console.log(`[orchestrator] Persisted CaseState for ${state.caseId} — phase: ${state.phase}`);
}

// ─── Transition Evaluation ──────────────────────────────────────

export interface TransitionResult {
  shouldAdvance: boolean;
  nextPhase: PipelinePhase | null;
  trigger: 'auto' | 'human';
  reason: string;
}

/**
 * Evaluate whether the current state should advance to the next phase.
 * Checks DAG edges, confidence thresholds, human gates, and QA loop limits.
 */
export function evaluateTransition(state: CaseState): TransitionResult {
  const currentPhase = state.phase;

  // Terminal phases — no further transitions
  if (currentPhase === 'complete' || currentPhase === 'failed') {
    return {
      shouldAdvance: false,
      nextPhase: null,
      trigger: 'auto',
      reason: `Phase '${currentPhase}' is terminal`,
    };
  }

  // Special case: QA → Drafting loop (score < 85 and iterations < 2)
  if (currentPhase === 'qa' && state.qa) {
    const qaScore = state.qa.score;
    const iterationCount = state.metadata.iterationCount;

    if (qaScore < 85 && iterationCount < 2) {
      return {
        shouldAdvance: true,
        nextPhase: 'drafting',
        trigger: 'auto',
        reason: `QA score ${qaScore}/100 < 85 — looping back to drafting (iteration ${iterationCount + 1}/2)`,
      };
    }

    if (qaScore >= 85) {
      return {
        shouldAdvance: true,
        nextPhase: 'pending_review',
        trigger: 'auto',
        reason: `QA score ${qaScore}/100 >= 85 — advancing to review`,
      };
    }

    // Score < 85 but iterations exhausted
    if (iterationCount >= 2) {
      return {
        shouldAdvance: true,
        nextPhase: 'pending_review',
        trigger: 'auto',
        reason: `QA score ${qaScore}/100 < 85 but max iterations (${iterationCount}) reached — advancing to review`,
      };
    }
  }

  // Find the first matching DAG edge for the current phase
  // (skip the QA→drafting loop edge since it's handled above)
  const edges = DAG_EDGES.filter(e => e.from === currentPhase);
  const edge = edges.find(e => {
    // For QA, we only want the forward edge (qa → pending_review) here
    if (currentPhase === 'qa' && e.to === 'drafting') return false;
    return true;
  });

  if (!edge) {
    return {
      shouldAdvance: false,
      nextPhase: null,
      trigger: 'auto',
      reason: `No DAG edge found from phase '${currentPhase}'`,
    };
  }

  // Human gate — never auto-advance
  if (edge.condition === 'human') {
    return {
      shouldAdvance: false,
      nextPhase: edge.to,
      trigger: 'human',
      reason: `Phase '${currentPhase}' requires human approval to advance to '${edge.to}'`,
    };
  }

  // Threshold check — calculate confidence for the current phase
  if (edge.condition === 'threshold' && edge.threshold !== undefined) {
    const confidence = calculateConfidence(currentPhase, state);

    if (confidence >= edge.threshold) {
      return {
        shouldAdvance: true,
        nextPhase: edge.to,
        trigger: 'auto',
        reason: `Confidence ${confidence.toFixed(2)} >= threshold ${edge.threshold} — advancing`,
      };
    }

    return {
      shouldAdvance: false,
      nextPhase: edge.to,
      trigger: 'auto',
      reason: `Confidence ${confidence.toFixed(2)} < threshold ${edge.threshold} — holding`,
    };
  }

  // Auto — always advance
  return {
    shouldAdvance: true,
    nextPhase: edge.to,
    trigger: 'auto',
    reason: `Auto-advance from '${currentPhase}' to '${edge.to}'`,
  };
}

// ─── Confidence Calculation ─────────────────────────────────────

/**
 * Calculate confidence score for a given phase based on the CaseState contents.
 * Returns a value between 0.0 and 1.0.
 */
export function calculateConfidence(phase: PipelinePhase, state: CaseState): number {
  switch (phase) {
    case 'intake': {
      if (!state.intake) return 0;
      let score = 0;
      let checks = 0;

      // Has documents cataloged
      checks++;
      if (state.intake.documents.length > 0) score++;

      // Has case type
      checks++;
      if (state.intake.caseType && state.intake.caseType.length > 0) score++;

      // Has report type
      checks++;
      if (state.intake.reportType && state.intake.reportType.length > 0) score++;

      // No missing fields is ideal
      checks++;
      if (state.intake.missingFields.length === 0) score++;

      // Has flags (indicates the agent analyzed the case)
      checks++;
      if (state.intake.flags.length >= 0) score++; // flags can be empty — that's valid

      return checks > 0 ? score / checks : 0;
    }

    case 'research': {
      if (!state.research) return 0;
      let score = 0;
      let checks = 0;

      // Has findings
      checks++;
      if (state.research.findings.length > 0) score++;

      // Has standards referenced
      checks++;
      if (state.research.standardsReferenced.length > 0) score++;

      // Has attack patterns used
      checks++;
      if (state.research.attackPatternsUsed.length > 0) score++;

      return checks > 0 ? score / checks : 0;
    }

    case 'drafting': {
      if (!state.drafting) return 0;
      let score = 0;
      let checks = 0;

      // Total word count above minimum
      checks++;
      if (state.drafting.totalWordCount > 500) score++;

      // Has a voice score
      checks++;
      if (state.drafting.voiceScore > 0) score++;

      // Has sections
      checks++;
      if (state.drafting.sections.length > 0) score++;

      // Few or no placeholders remaining
      checks++;
      if (state.drafting.placeholders.length === 0) score++;

      return checks > 0 ? score / checks : 0;
    }

    case 'qa': {
      if (!state.qa) return 0;
      // QA confidence is the score normalized to 0-1
      return state.qa.score / 100;
    }

    default:
      return 0;
  }
}

// ─── Phase Advancement ──────────────────────────────────────────

/**
 * Advance the CaseState to the next phase as determined by the DAG.
 * Pushes a StateTransition to history, updates the phase, and returns
 * the mutated state. Does NOT persist — caller must call persistState().
 */
export function advancePhase(
  state: CaseState,
  trigger: 'auto' | 'human',
  reason: string,
): CaseState {
  const evaluation = evaluateTransition(state);

  if (!evaluation.nextPhase) {
    console.warn(
      `[orchestrator] Cannot advance from '${state.phase}' — no next phase. Reason: ${evaluation.reason}`,
    );
    return state;
  }

  const transition: StateTransition = {
    from: state.phase,
    to: evaluation.nextPhase,
    timestamp: new Date().toISOString(),
    trigger,
    confidence: calculateConfidence(state.phase, state),
    reason,
  };

  state.history.push(transition);
  const previousPhase = state.phase;
  state.phase = evaluation.nextPhase;

  // Track QA→drafting loop iterations
  if (previousPhase === 'qa' && evaluation.nextPhase === 'drafting') {
    state.metadata.iterationCount++;
  }

  // Mark completion timestamp
  if (evaluation.nextPhase === 'complete') {
    state.metadata.completedAt = new Date().toISOString();
  }

  console.log(
    `[orchestrator] Phase transition: ${previousPhase} → ${evaluation.nextPhase} (trigger: ${trigger}, reason: ${reason})`,
  );

  return state;
}

// ─── Human Gate Approval ────────────────────────────────────────

/**
 * Handle human approval at a gate (research or review).
 * Loads the current state, advances past the gate, persists, and returns
 * the updated state.
 *
 * @param caseId - Case identifier
 * @param gate - Which gate: 'research' (pending_research_approval → drafting)
 *               or 'review' (pending_review → export)
 */
export async function approveGate(
  caseId: string,
  gate: 'research' | 'review',
): Promise<CaseState> {
  const state = await getOrCreateState(caseId);

  const expectedPhase: PipelinePhase =
    gate === 'research' ? 'pending_research_approval' : 'pending_review';
  const targetPhase: PipelinePhase =
    gate === 'research' ? 'drafting' : 'export';

  if (state.phase !== expectedPhase) {
    console.warn(
      `[orchestrator] approveGate('${gate}') called but case ${caseId} is in phase '${state.phase}', expected '${expectedPhase}'`,
    );
    // Return current state without advancing — the caller can decide how to handle
    return state;
  }

  const transition: StateTransition = {
    from: state.phase,
    to: targetPhase,
    timestamp: new Date().toISOString(),
    trigger: 'human',
    confidence: calculateConfidence(state.phase, state),
    reason: `Lane approved ${gate} gate`,
  };

  state.history.push(transition);
  state.phase = targetPhase;

  // Mark start time on first forward motion
  if (!state.metadata.startedAt) {
    state.metadata.startedAt = new Date().toISOString();
  }

  await persistState(state);

  console.log(
    `[orchestrator] Gate approved: ${expectedPhase} → ${targetPhase} for case ${caseId}`,
  );

  return state;
}

// ─── Pattern C — HITL routing ───────────────────────────────────

const PATTERN_C_DEFAULTS: PatternCConfig = {
  intakeConfidenceThreshold: 0.7,
  researchConfidenceThreshold: 0.7,
  draftingConfidenceThreshold: 0.65,
  qaPassThreshold: 70,
  voiceDriftThreshold: 0.15,
  autoAdvanceToastDuration: 4000,
};

let _patternCConfig: PatternCConfig | null = null;

/**
 * Load the Pattern C config from webapp/config/settings.json once and cache.
 * Falls back to PATTERN_C_DEFAULTS if the file is missing or malformed (logged).
 * The settings file is the source of truth; defaults are a safety net.
 */
export function getPatternCConfig(): PatternCConfig {
  if (_patternCConfig) return _patternCConfig;
  try {
    const path = join(process.cwd(), 'config', 'settings.json');
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { patternC?: Partial<PatternCConfig> };
    _patternCConfig = { ...PATTERN_C_DEFAULTS, ...(parsed.patternC ?? {}) };
  } catch (err) {
    console.warn('[orchestrator] settings.json not loaded — using Pattern C defaults:', err);
    _patternCConfig = PATTERN_C_DEFAULTS;
  }
  return _patternCConfig;
}

/** For tests — clears the cached config so a fresh read happens. */
export function _resetPatternCConfigCache(): void {
  _patternCConfig = null;
}

/**
 * Pure evaluator: given a stage's outputs + the per-case override + the
 * resolved global config, return the set of fired Pattern C triggers and
 * whether the orchestrator should auto-advance.
 *
 * Order of evaluation matches HITL-PATTERN-C-SPEC.md §Order of evaluation:
 * unconditional triggers (T9, T6, T8) → case override (T7) → threshold
 * checks (T1–T5, T10).
 */
export function evaluatePatternC(
  input: PatternCInput,
  override: PatternCOverride | null,
  config: PatternCConfig,
): PatternCResult {
  const triggers: PatternCTrigger[] = [];

  // Override-aware threshold lookup. Falls through to config when override
  // doesn't specify a value — per-case override is opt-in per field.
  const merged = {
    intakeConfidenceThreshold: override?.intakeConfidenceThreshold ?? config.intakeConfidenceThreshold,
    researchConfidenceThreshold: override?.researchConfidenceThreshold ?? config.researchConfidenceThreshold,
    draftingConfidenceThreshold: override?.draftingConfidenceThreshold ?? config.draftingConfidenceThreshold,
    qaPassThreshold: override?.qaPassThreshold ?? config.qaPassThreshold,
    voiceDriftThreshold: override?.voiceDriftThreshold ?? config.voiceDriftThreshold,
  };

  // ─── Unconditional triggers ───
  if (input.voiceGuardActive) {
    triggers.push({
      type: 'T9',
      reason: 'VOICE GUARD content detected — Caleb approval required (read-only)',
    });
  }

  if (input.isLaneGateTransition) {
    triggers.push({
      type: 'T6',
      reason: 'Research → Drafting requires Lane approval (Lane Gate)',
    });
  }

  if (input.agentError) {
    triggers.push({
      type: 'T8',
      reason: 'Agent stage emitted error event',
    });
  }

  // ─── Case-override trigger ───
  if (override?.superviseClosely) {
    triggers.push({
      type: 'T7',
      reason: 'Supervise closely toggled on for this case',
    });
  }

  // ─── Threshold-driven triggers ───
  // T1: low-confidence finding (any one finding below the stage threshold).
  const stageThresholds: Record<PatternCInput['stage'], number> = {
    intake: merged.intakeConfidenceThreshold,
    research: merged.researchConfidenceThreshold,
    drafting: merged.draftingConfidenceThreshold,
    qa: merged.intakeConfidenceThreshold, // QA findings reuse intake-style confidence threshold
  };
  const stageThreshold = stageThresholds[input.stage];
  const lowConfidence = input.findings.find(
    (f) => typeof f.confidence === 'number' && f.confidence < stageThreshold,
  );
  if (lowConfidence) {
    triggers.push({
      type: 'T1',
      reason: `Finding confidence ${lowConfidence.confidence!.toFixed(2)} < threshold ${stageThreshold}`,
      payload: { confidence: lowConfidence.confidence, threshold: stageThreshold },
    });
  }

  // T2: note-vs-document contradiction (caller-detected).
  if (input.hasNoteContradiction) {
    triggers.push({
      type: 'T2',
      reason: 'Note contradicts a parsed document — human reconciliation required',
    });
  }

  // T3: [AGENT BLIND] content (e.g., images without OCR) at intake/research time.
  if (input.hasAgentBlindContent) {
    triggers.push({
      type: 'T3',
      reason: 'Material has no extracted text — agent cannot reason over it',
    });
  }

  // T4: QA score below pass threshold (only fires on the QA stage).
  if (input.stage === 'qa' && typeof input.qaScore === 'number' && input.qaScore < merged.qaPassThreshold) {
    triggers.push({
      type: 'T4',
      reason: `QA score ${input.qaScore} < pass threshold ${merged.qaPassThreshold}`,
      payload: { score: input.qaScore, threshold: merged.qaPassThreshold },
    });
  }

  // T5: voice fingerprint drift > threshold (typically a drafting-stage signal).
  if (typeof input.voiceDrift === 'number' && input.voiceDrift > merged.voiceDriftThreshold) {
    triggers.push({
      type: 'T5',
      reason: `Voice drift ${input.voiceDrift.toFixed(3)} > threshold ${merged.voiceDriftThreshold}`,
      payload: { drift: input.voiceDrift, threshold: merged.voiceDriftThreshold },
    });
  }

  // T10: position-flip on pressure. STUB — fires only when an external detector
  // sets the flag. Real detection lands in a follow-up after Myers-case
  // calibration data exists (see PR 5.1 / future detector work).
  if (input.positionFlipDetected) {
    triggers.push({
      type: 'T10',
      reason: 'Position flip detected — agent reversed prior position under pressure',
    });
  }

  return { triggers, autoAdvance: triggers.length === 0 };
}

/**
 * Convenience wrapper: load case override + computed inputs from the DB,
 * then call evaluatePatternC. Used by agentRunner after a stage completes.
 *
 * `inputs.findings`, `inputs.qaScore`, `inputs.voiceDrift` come from the
 * just-completed stage output. T2/T9/T10 default false unless the agent or
 * an upstream detector sets them — those wires land in future PRs.
 */
export async function evaluatePatternCForCase(
  caseId: string,
  stage: PatternCInput['stage'],
  inputs: {
    findings: Array<{ confidence?: number }>;
    qaScore?: number;
    voiceDrift?: number;
    agentError?: boolean;
    hasNoteContradiction?: boolean;
    voiceGuardActive?: boolean;
    positionFlipDetected?: boolean;
  },
): Promise<PatternCResult> {
  const caseRow = await prisma.case.findUnique({
    where: { id: caseId },
    select: { patternCOverride: true },
  });
  const override = (caseRow?.patternCOverride ?? null) as PatternCOverride | null;

  const state = await getOrCreateState(caseId);
  const hasAgentBlindContent = state.documents.some(
    (d) => d.extractionStatus === 'pending' || d.extractionStatus === 'processing' || d.extractionStatus === 'failed',
  );

  // Lane Gate fires when the research stage just completed — research →
  // pending_research_approval → drafting requires Lane approval.
  const isLaneGateTransition = stage === 'research';

  const fullInput: PatternCInput = {
    stage,
    isLaneGateTransition,
    agentError: inputs.agentError ?? false,
    voiceGuardActive: inputs.voiceGuardActive ?? false,
    positionFlipDetected: inputs.positionFlipDetected ?? false,
    hasAgentBlindContent,
    hasNoteContradiction: inputs.hasNoteContradiction ?? false,
    findings: inputs.findings,
    qaScore: inputs.qaScore,
    voiceDrift: inputs.voiceDrift,
  };

  return evaluatePatternC(fullInput, override, getPatternCConfig());
}

// ─── Utility Exports ────────────────────────────────────────────

// Re-export for convenience — pipeline routes need these
export { routeModel, getComplexityFlags, estimateCostCents };
export { createInitialState };
