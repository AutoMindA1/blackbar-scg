// Typed agent output contracts.
//
// Each pipeline stage emits a JSON summary block (```json fenced) at the end
// of its response. agentRunner.ts extracts that block, validates it against
// the appropriate interface, and persists the parsed result on the
// `complete` agent_logs row under metadata.parsed.
//
// QA note: the QA stage continues to use the existing QAScorecard shape
// (status: 'pass'|'warning'|'fail', detail) so the working CaseQA UI and the
// /api/cases/:id/qa endpoint do not regress. QAResult is defined here for
// completeness so the AgentResult union covers all four stages from one place.

export interface IntakeResult {
  documents: Array<{
    name: string;
    type: 'deposition' | 'expert_report' | 'code_standard' | 'photograph' | 'contract' | 'correspondence' | 'other';
    pages: number;
  }>;
  flags: string[];
  missingFields: string[];
  caseType: string;
  reportType: string;
}

export interface ResearchResult {
  findings: Array<{
    id: string;
    opposingClaim: string;
    codeReference: string;
    reasoning: string;
    attackPattern: string;
    sourceDocument: string;
    sourcePage: number;
  }>;
  standardsReferenced: string[];
  attackPatternsUsed: string[];
}

export interface DraftingResult {
  sections: Array<{
    title: string;
    wordCount: number;
    hasPlaceholders: boolean;
  }>;
  totalWordCount: number;
  placeholders: string[];
  voiceScore: number;
  benchmarkUsed: string;
}

// QAResult mirrors the existing QAScorecard contract emitted by the live QA
// agent (agents/qa/BlackBar-QA.md). Field names are kept stable so the UI
// does not need to migrate.
export interface QAResult {
  score: number;
  benchmarkMatch?: number;
  checks: Array<{
    name: string;
    status: 'pass' | 'warning' | 'fail';
    detail: string;
  }>;
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    description: string;
    location: string;
  }>;
  // Optional claim-tracking fields — populated when the QA agent ran a
  // citation/claim verification pass.
  claimsVerified?: number;
  claimsFlagged?: number;
  claimsUnresolvable?: number;
}

export type AgentResult = IntakeResult | ResearchResult | DraftingResult | QAResult;

// Minimal valid fallback objects per stage. Used when the agent's JSON block
// fails to parse or fails schema validation. Keeps downstream consumers from
// crashing on missing fields and lets the UI render a graceful empty state.
export const FALLBACKS: {
  intake: IntakeResult;
  research: ResearchResult;
  drafting: DraftingResult;
  qa: QAResult;
} = {
  intake: { documents: [], flags: [], missingFields: [], caseType: '', reportType: '' },
  research: { findings: [], standardsReferenced: [], attackPatternsUsed: [] },
  drafting: { sections: [], totalWordCount: 0, placeholders: [], voiceScore: 0, benchmarkUsed: '' },
  qa: { score: 0, checks: [], issues: [] },
};

// Lightweight per-stage shape validators. Intentionally permissive — checks
// only the structural fields the UI relies on, not value bounds.
export function isIntakeResult(x: unknown): x is IntakeResult {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return Array.isArray(o.documents) && Array.isArray(o.flags) && Array.isArray(o.missingFields);
}

export function isResearchResult(x: unknown): x is ResearchResult {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return Array.isArray(o.findings) && Array.isArray(o.standardsReferenced) && Array.isArray(o.attackPatternsUsed);
}

export function isDraftingResult(x: unknown): x is DraftingResult {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return Array.isArray(o.sections) && typeof o.totalWordCount === 'number' && Array.isArray(o.placeholders);
}

export function isQAResult(x: unknown): x is QAResult {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.score === 'number' && Array.isArray(o.checks) && Array.isArray(o.issues);
}
