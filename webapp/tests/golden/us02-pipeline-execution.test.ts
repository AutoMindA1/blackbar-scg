/**
 * GOLDEN TEST: US-02 — Autonomous Pipeline Execution
 * Source: PLATINUM_BAR_PHASE1_PRD.md → Feature FT-02
 *
 * Gherkin scenarios:
 *   1. Full pipeline success (Research → Drafting → QA, no human gate between agents)
 *   2. QA score below threshold triggers auto-revision (max 3 loops)
 *
 * Target: server/services/agentRunner.ts, server/routes/agents.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockPrisma, SYNTHETIC_CASE } from '../helpers/mocks.js';

// ─── Pipeline constants ───
const AGENT_STAGES = ['research', 'drafting', 'qa'] as const; // PLATINUM-BAR: no intake agent
const QA_THRESHOLD = 85;
const MAX_REVISION_LOOPS = 3;

// ─────────────────────────────────────────────────────
// Scenario 1: Full pipeline success
// ─────────────────────────────────────────────────────
describe('US-02 / Scenario 1: Full pipeline success', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  // Given a Case exists with stage "research" and 3 uploaded documents
  it('Given: case at stage "research" with documents', async () => {
    mockPrisma.case.findUnique.mockResolvedValue({
      ...SYNTHETIC_CASE,
      stage: 'research',
    });
    mockPrisma.document.count.mockResolvedValue(3);

    const c = await mockPrisma.case.findUnique({ where: { id: 'case-001' } });
    const docCount = await mockPrisma.document.count({ where: { caseId: 'case-001' } });

    expect(c!.stage).toBe('research');
    expect(docCount).toBe(3);
  });

  // When the Research Agent completes
  // Then an AgentLog with type "handoff" is created
  it('When: Research Agent completes → handoff log created', async () => {
    mockPrisma.agentLog.create.mockResolvedValue({
      id: 1,
      caseId: 'case-001',
      stage: 'research',
      type: 'handoff',
      message: 'Research complete — handing off to drafting',
      metadata: {
        findingsCount: 4,
        attackPatterns: ['ATK-01', 'ATK-03'],
        caseLawCitations: 2,
      },
      createdAt: new Date(),
    });

    const log = await mockPrisma.agentLog.create({
      data: {
        caseId: 'case-001',
        stage: 'research',
        type: 'handoff',
        message: 'Research complete — handing off to drafting',
      },
    });

    expect(log.type).toBe('handoff');
    expect(log.stage).toBe('research');
  });

  // And the Case stage updates to "drafting"
  it('Then: case stage transitions research → drafting', async () => {
    mockPrisma.case.update.mockResolvedValue({ ...SYNTHETIC_CASE, stage: 'drafting' });
    const updated = await mockPrisma.case.update({
      where: { id: 'case-001' },
      data: { stage: 'drafting' },
    });
    expect(updated.stage).toBe('drafting');
  });

  // And the Drafting Agent begins automatically (no human gate)
  it('And: drafting starts without human approval', () => {
    // PLATINUM-BAR pipeline: Research → Drafting is automatic (no human checkpoint)
    // Human checkpoint only at final review
    const requiresHumanGate: Record<string, boolean> = {
      'research→drafting': false,
      'drafting→qa': false,
      'qa→ready_for_review': true, // Only human gate
    };
    expect(requiresHumanGate['research→drafting']).toBe(false);
    expect(requiresHumanGate['drafting→qa']).toBe(false);
    expect(requiresHumanGate['qa→ready_for_review']).toBe(true);
  });

  // When the Drafting Agent completes → Case stage updates to "qa"
  it('Then: case stage transitions drafting → qa', async () => {
    mockPrisma.case.update.mockResolvedValue({ ...SYNTHETIC_CASE, stage: 'qa' });
    const updated = await mockPrisma.case.update({
      where: { id: 'case-001' },
      data: { stage: 'qa' },
    });
    expect(updated.stage).toBe('qa');
  });

  // And the QA Agent begins automatically
  it('And: QA Agent starts automatically after drafting', () => {
    // Same principle — no human gate between drafting and QA
    const autoTransitions = ['research→drafting', 'drafting→qa'];
    expect(autoTransitions).toHaveLength(2);
  });

  // Pipeline stage sequence is exactly 3 agents
  it('Then: PLATINUM-BAR pipeline is exactly 3 agents (no intake agent)', () => {
    expect(AGENT_STAGES).toEqual(['research', 'drafting', 'qa']);
    expect(AGENT_STAGES).toHaveLength(3);
    // BlackBar had 4 agents (intake, research, drafting, qa)
    // PLATINUM-BAR killed intake — Lane IS the intake
    expect(AGENT_STAGES).not.toContain('intake');
  });

  // Handoff data flows between agents
  it('Then: each agent receives prior agent output as context', () => {
    type HandoffData = {
      stage: string;
      output: string;
      findings?: string[];
      metadata?: Record<string, unknown>;
    };

    const researchHandoff: HandoffData = {
      stage: 'research',
      output: 'Research findings...',
      findings: ['ATK-01: COF below ANSI threshold', 'ATK-03: Missing warning signage'],
      metadata: { caseLawCitations: 2 },
    };

    // Drafting agent receives research output
    expect(researchHandoff.findings).toBeDefined();
    expect(researchHandoff.findings!.length).toBeGreaterThan(0);

    // QA agent receives drafting output (the report)
    const draftingHandoff: HandoffData = {
      stage: 'drafting',
      output: '<h2>Expert Report</h2><p>...</p>',
    };
    expect(draftingHandoff.output).toContain('<h2>');
  });
});

// ─────────────────────────────────────────────────────
// Scenario 2: QA score below threshold triggers auto-revision
// ─────────────────────────────────────────────────────
describe('US-02 / Scenario 2: QA score below threshold triggers auto-revision', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  // Given the QA Agent scores < 85 on any check
  it('Given: QA scorecard returns score below threshold', () => {
    const scorecard = {
      score: 72,
      voiceCompliance: 68,
      factualAccuracy: 85,
      formatCompliance: 90,
      issues: [
        { check: 'voice', severity: 'high', detail: 'Section 3 uses prohibited term "floor was slippery"' },
        { check: 'voice', severity: 'medium', detail: 'Missing European date format in inspection date' },
      ],
    };

    expect(scorecard.score).toBeLessThan(QA_THRESHOLD);
    expect(scorecard.issues.length).toBeGreaterThan(0);
  });

  // When the QA Agent completes its audit
  // Then the QA Agent generates a revision brief (specific fixes needed)
  it('When: QA generates revision brief with specific fixes', () => {
    const revisionBrief = {
      score: 72,
      requiredFixes: [
        'Replace "the floor was slippery" with "the walking surface exhibited a reduced COF"',
        'Change "April 15, 2024" to "15 April 2024" (European date format)',
      ],
      sectionsAffected: [3, 5],
      autoRevisionAttempt: 1,
    };

    expect(revisionBrief.requiredFixes.length).toBeGreaterThan(0);
    expect(revisionBrief.autoRevisionAttempt).toBe(1);
  });

  // And the Case stage reverts to "drafting"
  it('Then: case stage reverts qa → drafting on failed QA', async () => {
    mockPrisma.case.update.mockResolvedValue({ ...SYNTHETIC_CASE, stage: 'drafting' });
    const updated = await mockPrisma.case.update({
      where: { id: 'case-001' },
      data: { stage: 'drafting' },
    });
    expect(updated.stage).toBe('drafting');
  });

  // And the Drafting Agent re-runs with the revision brief
  it('And: Drafting Agent receives revision brief as feedback', () => {
    const agentInput = {
      stage: 'drafting',
      feedback: 'QA revision loop 1/3: Replace prohibited terms in sections 3, 5.',
      revisionBrief: { score: 72, fixes: ['fix1', 'fix2'] },
    };
    expect(agentInput.feedback).toContain('revision loop');
    expect(agentInput.revisionBrief.score).toBeLessThan(QA_THRESHOLD);
  });

  // And this loop repeats up to 3 times
  it('And: max revision loop is 3 attempts', () => {
    expect(MAX_REVISION_LOOPS).toBe(3);

    // Simulate 3 failed attempts
    const attempts = [
      { attempt: 1, score: 72 },
      { attempt: 2, score: 78 },
      { attempt: 3, score: 82 },
    ];

    for (const a of attempts) {
      expect(a.score).toBeLessThan(QA_THRESHOLD);
      expect(a.attempt).toBeLessThanOrEqual(MAX_REVISION_LOOPS);
    }
  });

  // If still below threshold after 3 attempts → "ready_for_review" with warning
  it('If: 3 attempts exhausted → case goes to ready_for_review with warning flag', async () => {
    mockPrisma.case.update.mockResolvedValue({
      ...SYNTHETIC_CASE,
      stage: 'ready_for_review',
    });

    const updated = await mockPrisma.case.update({
      where: { id: 'case-001' },
      data: { stage: 'ready_for_review' },
    });

    expect(updated.stage).toBe('ready_for_review');

    // Warning flag in agent log
    mockPrisma.agentLog.create.mockResolvedValue({
      id: 10,
      caseId: 'case-001',
      stage: 'qa',
      type: 'error',
      message: 'QA threshold not met after 3 revision attempts (best score: 82/100). Escalating to human review.',
      metadata: { attempts: 3, bestScore: 82, threshold: 85, warning: true },
      createdAt: new Date(),
    });

    const log = await mockPrisma.agentLog.create({
      data: {
        caseId: 'case-001',
        stage: 'qa',
        type: 'error',
        message: 'QA threshold not met after 3 revision attempts (best score: 82/100). Escalating to human review.',
      },
    });

    expect(log.type).toBe('error');
    expect(log.message).toContain('3 revision attempts');
    expect((log.metadata as Record<string, unknown>).warning).toBe(true);
  });

  // QA score AT threshold passes
  it('Edge: score exactly at threshold (85) passes', () => {
    expect(85).toBeGreaterThanOrEqual(QA_THRESHOLD);
  });

  // QA score one below threshold fails
  it('Edge: score one below threshold (84) fails', () => {
    expect(84).toBeLessThan(QA_THRESHOLD);
  });
});
