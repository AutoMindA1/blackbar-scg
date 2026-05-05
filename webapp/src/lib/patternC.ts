/**
 * Frontend mirror of server/types/patternC.ts. Kept duplicated rather than
 * imported across the bundle boundary so the client stays self-contained.
 *
 * Reference: HITL-PATTERN-C-SPEC.md (T1–T9) plus T10 (position-flip on pressure).
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
  | 'T10'; // position-flip on pressure (stub)

export interface PatternCTrigger {
  type: PatternCTriggerType;
  reason: string;
  payload?: Record<string, unknown>;
}

export interface PatternCOverride {
  superviseClosely?: boolean;
  intakeConfidenceThreshold?: number;
  researchConfidenceThreshold?: number;
  draftingConfidenceThreshold?: number;
  qaPassThreshold?: number;
  voiceDriftThreshold?: number;
}

export const TRIGGER_LABEL: Record<PatternCTriggerType, string> = {
  T1: 'Low confidence',
  T2: 'Note contradicts document',
  T3: 'Agent blind content',
  T4: 'QA below threshold',
  T5: 'Voice drift',
  T6: 'Lane Gate',
  T7: 'Supervise closely',
  T8: 'Agent error',
  T9: 'Voice guard',
  T10: 'Position flip',
};

/** True if any T9 trigger is present — gates the modal's Approve action. */
export function hasVoiceGuard(triggers: PatternCTrigger[] | undefined): boolean {
  return !!triggers?.some((t) => t.type === 'T9');
}

/**
 * One-line detail rendered in the modal under each trigger pill.
 * T10 is a stub today — its detector wires up after Myers calibration.
 */
export function triggerDetailLine(t: PatternCTrigger): string {
  if (t.type === 'T10') {
    return 'Position flip detected — details pending (external detector to be wired).';
  }
  return t.reason;
}
