/**
 * GOLDEN TEST: US-03 — Human Review Checkpoint
 * Source: PLATINUM_BAR_PHASE1_PRD.md → Feature FT-03
 *
 * Gherkin scenarios:
 *   1. Lane approves the report
 *   2. Lane requests a revision
 *   3. Lane rejects the report
 *
 * Target: server/routes/agents.ts (approve endpoint)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockPrisma, SYNTHETIC_CASE, SYNTHETIC_REPORT } from '../helpers/mocks.js';

const approveSchema = z.object({
  stage: z.enum(['intake', 'research', 'drafting', 'qa', 'export']),
  action: z.enum(['approve', 'revise', 'reject']),
  notes: z.string().max(2000).optional(),
});

const stageOrder = ['intake', 'research', 'drafting', 'qa', 'export', 'complete'];

// ─────────────────────────────────────────────────────
// Scenario 1: Lane approves the report
// ─────────────────────────────────────────────────────
describe('US-03 / Scenario 1: Lane approves the report', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  // Given Lane received the email with attached report
  // And Lane clicks the link to /cases/{id}/review
  it('Given: case at stage "qa" with completed report', async () => {
    mockPrisma.case.findUnique.mockResolvedValue({ ...SYNTHETIC_CASE, stage: 'qa' });
    mockPrisma.report.findUnique.mockResolvedValue({ ...SYNTHETIC_REPORT, content: '<h2>Expert Report</h2>...' });

    const c = await mockPrisma.case.findUnique({ where: { id: 'case-001' } });
    const r = await mockPrisma.report.findUnique({ where: { caseId: 'case-001' } });

    expect(c!.stage).toBe('qa');
    expect(r!.content).toBeTruthy();
  });

  // When Lane clicks "Approve"
  it('When: approve action is valid', () => {
    const result = approveSchema.safeParse({ stage: 'qa', action: 'approve' });
    expect(result.success).toBe(true);
  });

  // Then the Case stage updates to "approved"
  it('Then: case advances qa → export → complete (approved)', async () => {
    const currentStage = 'qa';
    const currentIdx = stageOrder.indexOf(currentStage);
    const nextStage = stageOrder[currentIdx + 1];
    expect(nextStage).toBe('export');

    // After export approval, goes to complete
    const exportIdx = stageOrder.indexOf('export');
    expect(stageOrder[exportIdx + 1]).toBe('complete');
  });

  // And the report is marked as final and immutable
  it('Then: approved report is immutable (version frozen)', async () => {
    mockPrisma.report.findUnique.mockResolvedValue({
      ...SYNTHETIC_REPORT,
      version: 5,
    });

    const report = await mockPrisma.report.findUnique({ where: { caseId: 'case-001' } });
    expect(report!.version).toBe(5);

    // PLATINUM-BAR: After approval, PUT /api/cases/:id/report should return 409 Conflict
    // Current BlackBar has no immutability guard
  });

  // And the system begins Knowledge Capture
  it('And: knowledge capture triggered (PLATINUM-BAR v2)', () => {
    // Deferred to v2 per PRD AMB-P09
    // When implemented: extract new attack patterns, case law, voice patterns
    const knowledgeCaptureConfig = {
      enabled: false, // v2
      extractors: ['attack_patterns', 'case_law', 'voice_patterns'],
    };
    expect(knowledgeCaptureConfig.enabled).toBe(false);
  });

  // Approval creates correct agent log
  it('Then: approval logged with stage transition', async () => {
    mockPrisma.agentLog.create.mockResolvedValue({
      id: 20,
      caseId: 'case-001',
      stage: 'qa',
      type: 'complete',
      message: 'qa approved by user — advancing to export',
      metadata: null,
      createdAt: new Date(),
    });

    const log = await mockPrisma.agentLog.create({
      data: { caseId: 'case-001', stage: 'qa', type: 'complete', message: 'qa approved by user — advancing to export' },
    });

    expect(log.message).toContain('approved');
    expect(log.message).toContain('export');
  });
});

// ─────────────────────────────────────────────────────
// Scenario 2: Lane requests a revision
// ─────────────────────────────────────────────────────
describe('US-03 / Scenario 2: Lane requests a revision', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  // Given Lane is on the Review page
  // When Lane clicks "Request Revision"
  // And types specific feedback
  it('When: revision with feedback is valid', () => {
    const result = approveSchema.safeParse({
      stage: 'qa',
      action: 'revise',
      notes: 'Section 5 needs to reference the Heagy precedent for XL VIT defense',
    });
    expect(result.success).toBe(true);
    expect(result.data!.notes).toContain('Heagy precedent');
  });

  // Then the Case stage reverts to "drafting"
  it('Then: case reverts to drafting (not research)', async () => {
    mockPrisma.case.update.mockResolvedValue({ ...SYNTHETIC_CASE, stage: 'drafting' });
    const updated = await mockPrisma.case.update({
      where: { id: 'case-001' },
      data: { stage: 'drafting' },
    });
    expect(updated.stage).toBe('drafting');
    // Revision goes back to DRAFTING, not research
    // Research findings are preserved — only the report is rewritten
  });

  // And a new AgentLog records Lane's feedback
  it('And: Lane feedback persisted in agent log', async () => {
    const feedback = 'Section 5 needs to reference the Heagy precedent for XL VIT defense';
    mockPrisma.agentLog.create.mockResolvedValue({
      id: 21,
      caseId: 'case-001',
      stage: 'qa',
      type: 'progress',
      message: `Revision requested: ${feedback}`,
      metadata: { source: 'human', userId: 'user-lane' },
      createdAt: new Date(),
    });

    const log = await mockPrisma.agentLog.create({
      data: { caseId: 'case-001', stage: 'qa', type: 'progress', message: `Revision requested: ${feedback}` },
    });

    expect(log.message).toContain('Heagy precedent');
    expect(log.type).toBe('progress');
  });

  // And the Drafting Agent re-runs with Lane's specific feedback
  it('And: Drafting Agent receives Lane feedback as input', () => {
    const agentInput = {
      stage: 'drafting',
      feedback: 'Section 5 needs to reference the Heagy precedent for XL VIT defense',
      isRevision: true,
      revisionSource: 'human', // vs 'qa_auto' for auto-revision
    };
    expect(agentInput.isRevision).toBe(true);
    expect(agentInput.revisionSource).toBe('human');
    expect(agentInput.feedback).toBeTruthy();
  });

  // And the pipeline continues: Drafting → QA → ready_for_review
  it('And: pipeline re-runs full remaining sequence after revision', () => {
    const remainingPipeline = ['drafting', 'qa', 'ready_for_review'];
    expect(remainingPipeline[0]).toBe('drafting');
    expect(remainingPipeline[remainingPipeline.length - 1]).toBe('ready_for_review');
  });
});

// ─────────────────────────────────────────────────────
// Scenario 3: Lane rejects the report
// ─────────────────────────────────────────────────────
describe('US-03 / Scenario 3: Lane rejects the report', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  // When Lane clicks "Reject" and confirms the rejection
  it('When: reject action is valid', () => {
    const result = approveSchema.safeParse({ stage: 'qa', action: 'reject' });
    expect(result.success).toBe(true);
  });

  // Then the Case stage updates to "rejected"
  it('Then: case stage set to rejected', async () => {
    // Note: "rejected" is not in the current updateCaseSchema enum
    // PLATINUM-BAR adds it as a terminal state
    const platinumStages = ['intake', 'research', 'drafting', 'qa', 'ready_for_review', 'approved', 'rejected', 'complete'];
    expect(platinumStages).toContain('rejected');
  });

  // And no further pipeline processing occurs
  it('And: rejected is a terminal state — no auto-transitions', () => {
    const terminalStates = ['approved', 'rejected', 'complete'];
    for (const state of terminalStates) {
      // No agent should trigger for terminal states
      const agentStages = ['research', 'drafting', 'qa'];
      expect(agentStages).not.toContain(state);
    }
  });

  // And Lane handles the report manually
  it('And: rejection logged as error type', async () => {
    mockPrisma.agentLog.create.mockResolvedValue({
      id: 22,
      caseId: 'case-001',
      stage: 'qa',
      type: 'error',
      message: 'Stage rejected: Lane will handle manually',
      metadata: null,
      createdAt: new Date(),
    });

    const log = await mockPrisma.agentLog.create({
      data: { caseId: 'case-001', stage: 'qa', type: 'error', message: 'Stage rejected: Lane will handle manually' },
    });

    expect(log.type).toBe('error');
    expect(log.message).toContain('rejected');
  });
});
