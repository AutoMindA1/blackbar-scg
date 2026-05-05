/**
 * Pattern C — HITL routing types.
 *
 * After every agent stage completes, the orchestrator evaluates whether to
 * fire a HITL modal (hitl_required) or auto-advance silently (auto_advance).
 * A modal fires if any T1–T10 trigger evaluates true; otherwise auto-advance.
 *
 * Reference: HITL-PATTERN-C-SPEC.md (T1–T9) plus T10 (position-flip on pressure)
 * added per /ship-v1.
 */

export type PatternCTriggerType =
  | 'T1' // low-confidence finding
  | 'T2' // note vs document contradiction
  | 'T3' // [AGENT BLIND] content present
  | 'T4' // QA score below pass threshold
  | 'T5' // voice fingerprint drift
  | 'T6' // Lane Gate (Research → Drafting)
  | 'T7' // supervise closely toggled on for case
  | 'T8' // agent error
  | 'T9' // [VOICE GUARD] content
  | 'T10'; // position-flip on pressure (stub — real detector pending)

export interface PatternCTrigger {
  type: PatternCTriggerType;
  reason: string;
  payload?: Record<string, unknown>;
}

export interface PatternCResult {
  triggers: PatternCTrigger[];
  /** True iff triggers.length === 0. */
  autoAdvance: boolean;
}

export interface PatternCConfig {
  intakeConfidenceThreshold: number;
  researchConfidenceThreshold: number;
  draftingConfidenceThreshold: number;
  qaPassThreshold: number;
  voiceDriftThreshold: number;
  autoAdvanceToastDuration: number;
}

export interface PatternCOverride {
  superviseClosely?: boolean;
  intakeConfidenceThreshold?: number;
  researchConfidenceThreshold?: number;
  draftingConfidenceThreshold?: number;
  qaPassThreshold?: number;
  voiceDriftThreshold?: number;
}

export interface PatternCInput {
  stage: 'intake' | 'research' | 'drafting' | 'qa';
  /** True when the upcoming transition is research → drafting. */
  isLaneGateTransition: boolean;
  agentError: boolean;
  voiceGuardActive: boolean;
  positionFlipDetected: boolean;
  hasAgentBlindContent: boolean;
  hasNoteContradiction: boolean;
  findings: Array<{ confidence?: number }>;
  qaScore?: number;
  voiceDrift?: number;
}
