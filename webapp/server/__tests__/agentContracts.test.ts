import { describe, it, expect } from 'vitest';
import {
  isIntakeResult,
  isResearchResult,
  isDraftingResult,
  isQAResult,
  FALLBACKS,
} from '../types/agentContracts.js';

describe('isIntakeResult', () => {
  it('returns true for a valid intake object', () => {
    const valid = {
      documents: [{ name: 'depo.pdf', type: 'deposition', pages: 42 }],
      flags: ['missing witness list'],
      missingFields: ['jurisdiction'],
      caseType: 'trip_fall',
      reportType: 'Initial',
    };
    expect(isIntakeResult(valid)).toBe(true);
  });

  it('returns true when arrays are empty', () => {
    expect(isIntakeResult({ documents: [], flags: [], missingFields: [] })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isIntakeResult(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isIntakeResult(undefined)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isIntakeResult({})).toBe(false);
  });

  it('returns false when documents is missing', () => {
    expect(isIntakeResult({ flags: [], missingFields: [] })).toBe(false);
  });

  it('returns false when flags is missing', () => {
    expect(isIntakeResult({ documents: [], missingFields: [] })).toBe(false);
  });

  it('returns false when missingFields is missing', () => {
    expect(isIntakeResult({ documents: [], flags: [] })).toBe(false);
  });

  it('returns false when documents is not an array', () => {
    expect(isIntakeResult({ documents: 'not-array', flags: [], missingFields: [] })).toBe(false);
  });
});

describe('isResearchResult', () => {
  it('returns true for a valid research object', () => {
    const valid = {
      findings: [
        {
          id: 'F1',
          opposingClaim: 'Claim A',
          codeReference: 'IBC 2021 §1607',
          reasoning: 'The standard applies because...',
          attackPattern: 'ATK-001',
          sourceDocument: 'depo.pdf',
          sourcePage: 12,
        },
      ],
      standardsReferenced: ['IBC 2021'],
      attackPatternsUsed: ['ATK-001'],
    };
    expect(isResearchResult(valid)).toBe(true);
  });

  it('returns true when all arrays are empty', () => {
    expect(isResearchResult({ findings: [], standardsReferenced: [], attackPatternsUsed: [] })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isResearchResult(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isResearchResult(undefined)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isResearchResult({})).toBe(false);
  });

  it('returns false when findings is missing', () => {
    expect(isResearchResult({ standardsReferenced: [], attackPatternsUsed: [] })).toBe(false);
  });

  it('returns false when standardsReferenced is a string', () => {
    expect(isResearchResult({ findings: [], standardsReferenced: 'IBC', attackPatternsUsed: [] })).toBe(false);
  });
});

describe('isDraftingResult', () => {
  it('returns true for a valid drafting object', () => {
    const valid = {
      sections: [{ title: 'Introduction', wordCount: 500, hasPlaceholders: false }],
      totalWordCount: 3200,
      placeholders: [],
      voiceScore: 85,
      benchmarkUsed: 'Gleason',
    };
    expect(isDraftingResult(valid)).toBe(true);
  });

  it('returns true with empty arrays and zero word count', () => {
    expect(isDraftingResult({ sections: [], totalWordCount: 0, placeholders: [] })).toBe(true);
  });

  it('returns false when totalWordCount is a string instead of number', () => {
    expect(isDraftingResult({ sections: [], totalWordCount: '3200', placeholders: [] })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isDraftingResult(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isDraftingResult(undefined)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isDraftingResult({})).toBe(false);
  });

  it('returns false when sections is missing', () => {
    expect(isDraftingResult({ totalWordCount: 100, placeholders: [] })).toBe(false);
  });
});

describe('isQAResult', () => {
  it('returns true for a valid QA object', () => {
    const valid = {
      score: 87,
      checks: [{ name: 'voice_match', status: 'pass', detail: 'Voice is consistent' }],
      issues: [{ severity: 'warning', description: 'Placeholder found', location: 'Section 3' }],
    };
    expect(isQAResult(valid)).toBe(true);
  });

  it('returns true with empty arrays and zero score', () => {
    expect(isQAResult({ score: 0, checks: [], issues: [] })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isQAResult(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isQAResult(undefined)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isQAResult({})).toBe(false);
  });

  it('returns false when score is a string instead of number', () => {
    expect(isQAResult({ score: '87', checks: [], issues: [] })).toBe(false);
  });

  it('returns false when checks is missing', () => {
    expect(isQAResult({ score: 87, issues: [] })).toBe(false);
  });
});

describe('FALLBACKS', () => {
  it('has all four stage keys', () => {
    expect(Object.keys(FALLBACKS)).toEqual(
      expect.arrayContaining(['intake', 'research', 'drafting', 'qa']),
    );
    expect(Object.keys(FALLBACKS)).toHaveLength(4);
  });

  it('intake fallback passes isIntakeResult', () => {
    expect(isIntakeResult(FALLBACKS.intake)).toBe(true);
  });

  it('research fallback passes isResearchResult', () => {
    expect(isResearchResult(FALLBACKS.research)).toBe(true);
  });

  it('drafting fallback passes isDraftingResult', () => {
    expect(isDraftingResult(FALLBACKS.drafting)).toBe(true);
  });

  it('qa fallback passes isQAResult', () => {
    expect(isQAResult(FALLBACKS.qa)).toBe(true);
  });
});
