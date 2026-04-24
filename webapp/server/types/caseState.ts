/**
 * BlackBar v2 Pipeline — CaseState & DAG Types
 *
 * Typed representation of a case's position in the 4-stage forensic pipeline.
 * The CaseState is the single source of truth for pipeline progress, persisted
 * as AgentLog rows with type='pipeline_state'. The DAG edges define legal
 * transitions and their conditions (auto, human gate, threshold).
 *
 * Replaces the dormant prowl.ts/sentinel.ts speculative execution model with
 * a deterministic state machine that the orchestrator evaluates after every
 * stage completion or human action.
 */

import type {
  IntakeResult,
  ResearchResult,
  DraftingResult,
  QAResult,
} from './agentContracts.js';

// ─── Pipeline Phase ─────────────────────────────────────────────

export type PipelinePhase =
  | 'created'
  | 'ingestion'
  | 'intake'
  | 'research'
  | 'pending_research_approval'
  | 'drafting'
  | 'qa'
  | 'pending_review'
  | 'export'
  | 'complete'
  | 'failed';

// ─── Document Extraction State ──────────────────────────────────

export interface DocumentState {
  id: string;
  filename: string;
  mimeType: string | null;
  extractionStatus: 'pending' | 'processing' | 'ready' | 'failed' | 'unsupported';
  pageCount: number | null;
  hasContent: boolean;
}

// ─── State Transition History ───────────────────────────────────

export interface StateTransition {
  from: PipelinePhase;
  to: PipelinePhase;
  timestamp: string;
  trigger: 'auto' | 'human' | 'error' | 'timeout';
  confidence?: number;
  reason?: string;
}

// ─── CaseState — Full Pipeline Snapshot ─────────────────────────

export interface CaseState {
  caseId: string;
  phase: PipelinePhase;
  confidence: Record<string, number>;
  intake: IntakeResult | null;
  research: ResearchResult | null;
  drafting: DraftingResult | null;
  qa: QAResult | null;
  documents: DocumentState[];
  metadata: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostCents: number;
    startedAt: string | null;
    completedAt: string | null;
    iterationCount: number;
    modelUsed: Record<string, string>;
  };
  history: StateTransition[];
}

// ─── DAG Edge Definition ────────────────────────────────────────

export interface DAGEdge {
  from: PipelinePhase;
  to: PipelinePhase;
  condition: 'auto' | 'human' | 'threshold';
  threshold?: number;
  maxIterations?: number;
}

// ─── Model Configuration ────────────────────────────────────────

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

// ─── Factory ────────────────────────────────────────────────────

/**
 * Create a fresh CaseState for a new pipeline run.
 * Phase starts at 'created', all stage results null, empty arrays, zero metadata.
 */
export function createInitialState(caseId: string): CaseState {
  return {
    caseId,
    phase: 'created',
    confidence: {},
    intake: null,
    research: null,
    drafting: null,
    qa: null,
    documents: [],
    metadata: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostCents: 0,
      startedAt: null,
      completedAt: null,
      iterationCount: 0,
      modelUsed: {},
    },
    history: [],
  };
}
