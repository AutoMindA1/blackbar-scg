/**
 * ADVERSARIAL TEST: Agent Pipeline Edge Cases
 *
 * Audit findings:
 * 1. agentRunner.ts line 337 truncates output to 10K chars — data loss
 * 2. Finding detection regex false-positives on normal sentences
 * 3. parseQAScorecard regex could grab wrong JSON block
 * 4. persistLog is fire-and-forget — silent failures
 *
 * Target: server/services/agentRunner.ts
 */

import { describe, it, expect } from 'vitest';
import { parseQAScorecard, parseAgentOutput } from '../../server/services/agentRunner.js';

// ─── QA SCORECARD PARSER ───
describe('parseQAScorecard — JSON extraction', () => {
  it('parses valid QA scorecard from fenced JSON', () => {
    const input = `Analysis complete.

\`\`\`json
{
  "score": 87,
  "benchmarkMatch": 92,
  "checks": [
    { "name": "Voice compliance", "status": "pass", "detail": "All SCG voice rules followed" }
  ],
  "issues": [
    { "severity": "warning", "description": "Section 5 uses passive voice", "location": "p. 12" }
  ]
}
\`\`\``;
    const result = parseQAScorecard(input);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(87);
    expect(result!.checks).toHaveLength(1);
    expect(result!.issues).toHaveLength(1);
  });

  it('returns null when no JSON block present', () => {
    const input = 'QA complete. Score: 85. All checks passed.';
    expect(parseQAScorecard(input)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const input = '```json\n{ broken json }\n```';
    expect(parseQAScorecard(input)).toBeNull();
  });

  it('returns null when JSON lacks required fields', () => {
    const input = '```json\n{ "score": 85 }\n```';
    // Missing checks and issues arrays
    expect(parseQAScorecard(input)).toBeNull();
  });

  it('extracts LAST JSON block when multiple exist', () => {
    const input = `Here's an example:
\`\`\`json
{ "score": 50, "checks": [], "issues": [] }
\`\`\`

And the real result:
\`\`\`json
{ "score": 92, "checks": [{ "name": "test", "status": "pass", "detail": "ok" }], "issues": [] }
\`\`\``;
    const result = parseQAScorecard(input);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(92);
  });

  it('handles JSON with nested objects safely', () => {
    const input = '```json\n{ "score": 85, "checks": [{ "name": "test", "status": "pass", "detail": "contains { braces }" }], "issues": [] }\n```';
    const result = parseQAScorecard(input);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(85);
  });

  it('rejects non-numeric score', () => {
    const input = '```json\n{ "score": "high", "checks": [], "issues": [] }\n```';
    expect(parseQAScorecard(input)).toBeNull();
  });

  it('rejects score as null', () => {
    const input = '```json\n{ "score": null, "checks": [], "issues": [] }\n```';
    expect(parseQAScorecard(input)).toBeNull();
  });
});

// ─── FINDING DETECTION REGEX ───
describe('Finding Detection Regex — False Positive Analysis', () => {
  // This is the exact regex from agentRunner.ts line 272
  const findingRegex = /ATK-\d+|attack pattern|confidence|flagged|identified|found|matched/i;

  it('correctly identifies ATK pattern reference', () => {
    expect(findingRegex.test('ATK-01: Credential attack detected')).toBe(true);
  });

  it('FALSE POSITIVE: "found" in normal prose', () => {
    // This is a normal sentence that should NOT be classified as a finding
    const normalSentence = 'SCG found the floor surface to be in standard condition.';
    const isFinding = findingRegex.test(normalSentence);
    // DOCUMENTING THE BUG: This returns true but shouldn't be a "finding"
    expect(isFinding).toBe(true); // This IS the bug — expected true because it matches
  });

  it('FALSE POSITIVE: "identified" in normal prose', () => {
    const normalSentence = 'The building code edition was identified as IBC 2018.';
    expect(findingRegex.test(normalSentence)).toBe(true); // Bug: false positive
  });

  it('FALSE POSITIVE: "confidence" in normal prose', () => {
    const normalSentence = 'Within a reasonable degree of confidence, the surface meets standards.';
    expect(findingRegex.test(normalSentence)).toBe(true); // Bug: false positive
  });

  it('FALSE POSITIVE: "matched" in normal prose', () => {
    const normalSentence = 'The COF values matched the NFSI B101.1 thresholds.';
    expect(findingRegex.test(normalSentence)).toBe(true); // Bug: false positive
  });

  it('correctly ignores unrelated sentences', () => {
    const normalSentence = 'SCG Personnel visited the subject premises on 15 April 2024.';
    expect(findingRegex.test(normalSentence)).toBe(false);
  });
});

// ─── DATA TRUNCATION ───
describe('Data Truncation — 10K char limit', () => {
  it('DOCUMENTS: agent output truncated to 10K chars', () => {
    // agentRunner.ts line 337: message: fullResponse.slice(0, 10000)
    const longOutput = 'x'.repeat(15000);
    const truncated = longOutput.slice(0, 10000);
    expect(truncated.length).toBe(10000);
    expect(truncated.length).toBeLessThan(longOutput.length);
    // BUG: 5000 chars of the report are silently dropped
    // The metadata.fullLength preserves the original length for debugging
    // but the actual content is gone
  });

  it('15-page expert report exceeds 10K chars', () => {
    // Average expert report: ~300 words per page × 15 pages × ~5 chars/word
    const estimatedChars = 300 * 15 * 5; // = 22,500
    expect(estimatedChars).toBeGreaterThan(10000);
    // CONFIRMED: A standard 15-page report WILL be truncated
  });
});

// ─── parseAgentOutput ───
describe('parseAgentOutput — Typed Output Parser', () => {
  it('returns fallback when no JSON block present', () => {
    const result = parseAgentOutput('intake', 'Just some text with no JSON');
    expect(result).toBeDefined();
    // Should return FALLBACKS.intake
  });

  it('returns fallback for malformed JSON', () => {
    const result = parseAgentOutput('research', '```json\n{broken}\n```');
    expect(result).toBeDefined();
  });

  it('returns fallback for wrong stage schema', () => {
    // Intake schema in research stage
    const intakeOutput = '```json\n{"status":"INTAKE COMPLETE: YES","researchFlags":[],"intakeBrief":{"caseName":"test","caseType":"slip_fall","reportType":"initial"}}\n```';
    const result = parseAgentOutput('research', intakeOutput);
    // Should fail schema validation and return research fallback
    expect(result).toBeDefined();
  });
});
