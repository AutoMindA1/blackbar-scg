/**
 * Pattern C evaluator — pure-function tests.
 *
 * Verifies T1–T10 trigger logic, override-vs-config precedence, and the
 * autoAdvance contract (autoAdvance ⇔ triggers.length === 0).
 *
 * Target: server/services/orchestrator.ts (evaluatePatternC)
 */

import { describe, it, expect } from 'vitest';
import { evaluatePatternC } from '../services/orchestrator.js';
import type {
  PatternCConfig,
  PatternCInput,
  PatternCOverride,
} from '../types/patternC.js';

const CONFIG: PatternCConfig = {
  intakeConfidenceThreshold: 0.7,
  researchConfidenceThreshold: 0.7,
  draftingConfidenceThreshold: 0.65,
  qaPassThreshold: 70,
  voiceDriftThreshold: 0.15,
  autoAdvanceToastDuration: 4000,
};

function input(overrides: Partial<PatternCInput> = {}): PatternCInput {
  return {
    stage: 'intake',
    isLaneGateTransition: false,
    agentError: false,
    voiceGuardActive: false,
    positionFlipDetected: false,
    hasAgentBlindContent: false,
    hasNoteContradiction: false,
    findings: [],
    ...overrides,
  };
}

describe('evaluatePatternC', () => {
  it('auto-advances when no triggers fire', () => {
    const result = evaluatePatternC(input(), null, CONFIG);
    expect(result.autoAdvance).toBe(true);
    expect(result.triggers).toEqual([]);
  });

  it('T1 — low-confidence finding fires below stage threshold', () => {
    const result = evaluatePatternC(
      input({ stage: 'research', findings: [{ confidence: 0.5 }] }),
      null,
      CONFIG,
    );
    expect(result.autoAdvance).toBe(false);
    expect(result.triggers.map((t) => t.type)).toContain('T1');
  });

  it('T1 — does not fire when all findings meet threshold', () => {
    const result = evaluatePatternC(
      input({ stage: 'research', findings: [{ confidence: 0.9 }, { confidence: 0.75 }] }),
      null,
      CONFIG,
    );
    expect(result.triggers.map((t) => t.type)).not.toContain('T1');
  });

  it('T2 — note contradiction fires the trigger', () => {
    const result = evaluatePatternC(input({ hasNoteContradiction: true }), null, CONFIG);
    expect(result.triggers.map((t) => t.type)).toContain('T2');
  });

  it('T3 — agent-blind content fires', () => {
    const result = evaluatePatternC(input({ hasAgentBlindContent: true }), null, CONFIG);
    expect(result.triggers.map((t) => t.type)).toContain('T3');
  });

  it('T4 — QA score below threshold fires only on qa stage', () => {
    const onQA = evaluatePatternC(input({ stage: 'qa', qaScore: 60 }), null, CONFIG);
    expect(onQA.triggers.map((t) => t.type)).toContain('T4');

    // Same low score on a non-qa stage should NOT fire T4.
    const offQA = evaluatePatternC(input({ stage: 'drafting', qaScore: 60 }), null, CONFIG);
    expect(offQA.triggers.map((t) => t.type)).not.toContain('T4');
  });

  it('T4 — passing QA score does not fire', () => {
    const result = evaluatePatternC(input({ stage: 'qa', qaScore: 85 }), null, CONFIG);
    expect(result.triggers.map((t) => t.type)).not.toContain('T4');
  });

  it('T5 — voice drift above threshold fires', () => {
    const result = evaluatePatternC(input({ voiceDrift: 0.25 }), null, CONFIG);
    expect(result.triggers.map((t) => t.type)).toContain('T5');
  });

  it('T5 — drift at-or-below threshold does not fire', () => {
    const result = evaluatePatternC(input({ voiceDrift: 0.1 }), null, CONFIG);
    expect(result.triggers.map((t) => t.type)).not.toContain('T5');
  });

  it('T6 — Lane Gate fires unconditionally on research → drafting', () => {
    const result = evaluatePatternC(
      input({ stage: 'research', isLaneGateTransition: true }),
      null,
      CONFIG,
    );
    expect(result.triggers.map((t) => t.type)).toContain('T6');
  });

  it('T7 — supervise closely override fires', () => {
    const override: PatternCOverride = { superviseClosely: true };
    const result = evaluatePatternC(input(), override, CONFIG);
    expect(result.triggers.map((t) => t.type)).toContain('T7');
  });

  it('T8 — agent error fires', () => {
    const result = evaluatePatternC(input({ agentError: true }), null, CONFIG);
    expect(result.triggers.map((t) => t.type)).toContain('T8');
  });

  it('T9 — voice guard fires', () => {
    const result = evaluatePatternC(input({ voiceGuardActive: true }), null, CONFIG);
    expect(result.triggers.map((t) => t.type)).toContain('T9');
  });

  it('T10 — position flip fires only when flag is set (stub)', () => {
    const fired = evaluatePatternC(input({ positionFlipDetected: true }), null, CONFIG);
    expect(fired.triggers.map((t) => t.type)).toContain('T10');

    const notFired = evaluatePatternC(input({ positionFlipDetected: false }), null, CONFIG);
    expect(notFired.triggers.map((t) => t.type)).not.toContain('T10');
  });

  it('multiple triggers compose into a single result', () => {
    const result = evaluatePatternC(
      input({
        stage: 'qa',
        qaScore: 50,
        voiceGuardActive: true,
        hasAgentBlindContent: true,
      }),
      null,
      CONFIG,
    );
    expect(result.autoAdvance).toBe(false);
    const types = result.triggers.map((t) => t.type);
    expect(types).toContain('T9');
    expect(types).toContain('T3');
    expect(types).toContain('T4');
  });

  it('per-case override threshold beats the config threshold', () => {
    // Default qaPassThreshold is 70. Score 75 would normally pass.
    // Override raises it to 80; now 75 should fail T4.
    const override: PatternCOverride = { qaPassThreshold: 80 };
    const result = evaluatePatternC(input({ stage: 'qa', qaScore: 75 }), override, CONFIG);
    expect(result.triggers.map((t) => t.type)).toContain('T4');
  });

  it('override threshold is per-field — unset fields fall through to config', () => {
    const override: PatternCOverride = { qaPassThreshold: 80 };
    // Voice drift threshold not overridden — config 0.15 still applies.
    const result = evaluatePatternC(
      input({ stage: 'qa', qaScore: 90, voiceDrift: 0.2 }),
      override,
      CONFIG,
    );
    const types = result.triggers.map((t) => t.type);
    expect(types).not.toContain('T4'); // 90 >= 80, passes
    expect(types).toContain('T5'); // 0.2 > 0.15 default, fires
  });

  it('autoAdvance is true iff triggers is empty', () => {
    const empty = evaluatePatternC(input(), null, CONFIG);
    expect(empty.autoAdvance).toBe(empty.triggers.length === 0);

    const oneTrigger = evaluatePatternC(input({ agentError: true }), null, CONFIG);
    expect(oneTrigger.autoAdvance).toBe(false);
    expect(oneTrigger.triggers.length).toBeGreaterThan(0);
  });
});
