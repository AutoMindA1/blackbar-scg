import { describe, it, expect, vi } from 'vitest';

// Mock Prisma before importing the module under test
vi.mock('../db.js', () => ({
  prisma: {
    agentLog: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    case: { findUniqueOrThrow: vi.fn() },
  },
}));

// Mock promptLoader to avoid filesystem reads
vi.mock('../services/promptLoader.js', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('system prompt'),
  getBrainQueries: vi.fn().mockReturnValue(['query1']),
}));

import { parseAgentOutput, parseQAScorecard } from '../services/agentRunner.js';

describe('parseQAScorecard', () => {
  it('extracts the LAST json block from a multi-block response', () => {
    const response = `
Here is my analysis.

\`\`\`json
{"score": 50, "checks": [], "issues": []}
\`\`\`

Some more text...

\`\`\`json
{"score": 92, "checks": [{"name": "voice", "status": "pass", "detail": "ok"}], "issues": []}
\`\`\`
`;
    const result = parseQAScorecard(response);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(92);
    expect(result!.checks).toHaveLength(1);
    expect(result!.checks[0].name).toBe('voice');
  });

  it('returns null when no JSON block is present', () => {
    const response = 'This is just plain text with no code fences.';
    expect(parseQAScorecard(response)).toBeNull();
  });

  it('returns null when JSON is malformed', () => {
    const response = '```json\n{ broken json !!!\n```';
    expect(parseQAScorecard(response)).toBeNull();
  });

  it('returns null when JSON lacks required fields (score, checks, issues)', () => {
    const response = '```json\n{"foo": "bar", "baz": 42}\n```';
    expect(parseQAScorecard(response)).toBeNull();
  });

  it('returns null when score is not a number', () => {
    const response = '```json\n{"score": "high", "checks": [], "issues": []}\n```';
    expect(parseQAScorecard(response)).toBeNull();
  });

  it('returns null when checks is not an array', () => {
    const response = '```json\n{"score": 80, "checks": "none", "issues": []}\n```';
    expect(parseQAScorecard(response)).toBeNull();
  });
});

describe('parseAgentOutput', () => {
  it('returns valid IntakeResult for proper intake JSON', () => {
    const raw = `
Analysis complete.

\`\`\`json
{
  "documents": [{"name": "depo.pdf", "type": "deposition", "pages": 30}],
  "flags": ["missing photos"],
  "missingFields": ["jurisdiction"],
  "caseType": "trip_fall",
  "reportType": "Initial"
}
\`\`\`
`;
    const result = parseAgentOutput('intake', raw);
    expect(result).toEqual({
      documents: [{ name: 'depo.pdf', type: 'deposition', pages: 30 }],
      flags: ['missing photos'],
      missingFields: ['jurisdiction'],
      caseType: 'trip_fall',
      reportType: 'Initial',
    });
  });

  it('returns fallback when no JSON block exists', () => {
    const result = parseAgentOutput('intake', 'No JSON here at all.');
    expect(result).toEqual({
      documents: [],
      flags: [],
      missingFields: [],
      caseType: '',
      reportType: '',
    });
  });

  it('returns fallback when JSON fails schema validation', () => {
    // Valid JSON but doesn't match intake schema (missing documents array)
    const raw = '```json\n{"caseType": "trip_fall"}\n```';
    const result = parseAgentOutput('intake', raw);
    expect(result).toEqual({
      documents: [],
      flags: [],
      missingFields: [],
      caseType: '',
      reportType: '',
    });
  });

  it('returns fallback when JSON is malformed', () => {
    const raw = '```json\n{not valid json}\n```';
    const result = parseAgentOutput('intake', raw);
    expect(result).toEqual({
      documents: [],
      flags: [],
      missingFields: [],
      caseType: '',
      reportType: '',
    });
  });

  it('handles research stage correctly', () => {
    const raw = `
\`\`\`json
{
  "findings": [],
  "standardsReferenced": ["IBC 2021"],
  "attackPatternsUsed": ["ATK-001"]
}
\`\`\`
`;
    const result = parseAgentOutput('research', raw);
    expect(result).toEqual({
      findings: [],
      standardsReferenced: ['IBC 2021'],
      attackPatternsUsed: ['ATK-001'],
    });
  });

  it('handles drafting stage correctly', () => {
    const raw = `
\`\`\`json
{
  "sections": [{"title": "Intro", "wordCount": 500, "hasPlaceholders": false}],
  "totalWordCount": 3000,
  "placeholders": [],
  "voiceScore": 90,
  "benchmarkUsed": "Gleason"
}
\`\`\`
`;
    const result = parseAgentOutput('drafting', raw);
    expect(result).toEqual({
      sections: [{ title: 'Intro', wordCount: 500, hasPlaceholders: false }],
      totalWordCount: 3000,
      placeholders: [],
      voiceScore: 90,
      benchmarkUsed: 'Gleason',
    });
  });

  it('handles qa stage correctly', () => {
    const raw = `
\`\`\`json
{
  "score": 88,
  "checks": [{"name": "voice", "status": "pass", "detail": "Consistent"}],
  "issues": []
}
\`\`\`
`;
    const result = parseAgentOutput('qa', raw);
    expect(result).toEqual({
      score: 88,
      checks: [{ name: 'voice', status: 'pass', detail: 'Consistent' }],
      issues: [],
    });
  });

  it('returns intake fallback for unknown stage', () => {
    const raw = '```json\n{"foo": "bar"}\n```';
    const result = parseAgentOutput('unknown_stage', raw);
    // Unknown stage always fails validation, falls back to intake fallback
    expect(result).toEqual({
      documents: [],
      flags: [],
      missingFields: [],
      caseType: '',
      reportType: '',
    });
  });

  it('extracts the LAST json block when multiple blocks present', () => {
    const raw = `
\`\`\`json
{"documents": [], "flags": [], "missingFields": []}
\`\`\`

Some intermediate text...

\`\`\`json
{
  "documents": [{"name": "final.pdf", "type": "other", "pages": 10}],
  "flags": ["reviewed"],
  "missingFields": [],
  "caseType": "trip_fall",
  "reportType": "Rebuttal"
}
\`\`\`
`;
    const result = parseAgentOutput('intake', raw);
    expect(result).toEqual({
      documents: [{ name: 'final.pdf', type: 'other', pages: 10 }],
      flags: ['reviewed'],
      missingFields: [],
      caseType: 'trip_fall',
      reportType: 'Rebuttal',
    });
  });
});
