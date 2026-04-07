/**
 * BlackBar Pipeline Metrics — Measurement Framework
 *
 * Tracks everything about prowl and pipeline performance.
 * This is BlackBar's equivalent of the internal measurement framework:
 * - Prediction accuracy (did the human approve or revise?)
 * - Time saved (how much faster was the promoted prowl?)
 * - Sentinel effectiveness (does the sentinel catch real issues?)
 * - Cost tracking (API spend per case, per stage, prowl vs real)
 * - Chain depth (how many stages ahead did prowl successfully reach?)
 *
 * All metrics persist to the database via a dedicated PipelineMetric model.
 * Dashboard queries surface these as real-time KPIs.
 */

import { prisma } from '../db.js';
import type { ProwlJob } from './prowl.js';

// ─── Types ───────────────────────────────────────────────────────

export interface MetricEvent {
  type: 'prowl_started' | 'prowl_complete' | 'prowl_promoted' |
        'prowl_discarded' | 'sentinel_validated' | 'sentinel_rejected' |
        'stage_complete' | 'pipeline_complete' | 'api_call';
  caseId: string;
  stage: string;
  model?: string;
  tokensUsed?: number;
  costUsd?: number;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface PipelineSummary {
  totalCases: number;
  avgPipelineTimeMs: number;
  avgTimeSavedMs: number;
  prowlAccuracy: number;              // % of prowls promoted
  sentinelAccuracy: number;          // % of sentinel passes that humans also approved
  avgCostPerCase: number;
  avgProwlCostPerCase: number;       // cost of discarded prowls
  stageBreakdown: Record<string, StageMetrics>;
}

export interface StageMetrics {
  avgLatencyMs: number;
  prowlRate: number;              // % of times this stage was prowled
  promotionRate: number;         // % of prowls that were promoted
  revisionRate: number;          // % of times human revised (real or speculated)
  avgSentinelScore: number;
  avgTokensUsed: number;
}

// ─── In-Memory Buffer (flush to DB periodically) ─────────────────

const eventBuffer: MetricEvent[] = [];
const FLUSH_INTERVAL_MS = 10_000; // flush every 10 seconds
const MAX_BUFFER_SIZE = 100;

// ─── Recording Functions ─────────────────────────────────────────

/**
 * Record when prowl starts
 */
export function recordProwl(job: ProwlJob): void {
  pushEvent({
    type: 'prowl_started',
    caseId: job.caseId,
    stage: job.prowlStage,
    model: job.model,
    timestamp: job.startedAt,
    metadata: {
      fromStage: job.fromStage,
      prowlId: job.id,
    },
  });
}

/**
 * Record prowl outcome
 */
export function recordOutcome(
  job: ProwlJob,
  outcome: 'promoted' | 'revised' | 'rejected' | 'timeout' | 'sentinel_rejected' | 'too_slow' | 'error',
): void {
  const latencyMs = job.completedAt
    ? job.completedAt.getTime() - job.startedAt.getTime()
    : (job.discardedAt?.getTime() || Date.now()) - job.startedAt.getTime();

  pushEvent({
    type: outcome === 'promoted' ? 'prowl_promoted' : 'prowl_discarded',
    caseId: job.caseId,
    stage: job.prowlStage,
    model: job.model,
    latencyMs,
    timestamp: new Date(),
    metadata: {
      prowlId: job.id,
      outcome,
      sentinelScore: job.sentinelScore,
      fromStage: job.fromStage,
    },
  });
}

/**
 * Record an API call (for cost tracking)
 */
export function recordApiCall(
  caseId: string,
  stage: string,
  model: string,
  tokensUsed: number,
  latencyMs: number,
  speculative: boolean,
): void {
  // Cost estimation (approximate, based on public pricing)
  const costPerInputToken = model.includes('opus') ? 0.000015 : 0.000003;
  const costPerOutputToken = model.includes('opus') ? 0.000075 : 0.000015;
  // Rough split: 70% input, 30% output
  const inputTokens = Math.floor(tokensUsed * 0.7);
  const outputTokens = tokensUsed - inputTokens;
  const costUsd = (inputTokens * costPerInputToken) + (outputTokens * costPerOutputToken);

  pushEvent({
    type: 'api_call',
    caseId,
    stage,
    model,
    tokensUsed,
    costUsd,
    latencyMs,
    timestamp: new Date(),
    metadata: { speculative },
  });
}

/**
 * Record stage completion (real, not prowl)
 */
export function recordStageComplete(caseId: string, stage: string, latencyMs: number): void {
  pushEvent({
    type: 'stage_complete',
    caseId,
    stage,
    latencyMs,
    timestamp: new Date(),
  });
}

/**
 * Record full pipeline completion
 */
export function recordPipelineComplete(caseId: string, totalMs: number, totalCostUsd: number): void {
  pushEvent({
    type: 'pipeline_complete',
    caseId,
    stage: 'all',
    latencyMs: totalMs,
    costUsd: totalCostUsd,
    timestamp: new Date(),
  });
}

// ─── Query Functions ─────────────────────────────────────────────

/**
 * Get prowl stats for a specific case
 */
export async function getCaseMetrics(caseId: string): Promise<{
  prowls: number;
  promoted: number;
  discarded: number;
  timeSavedMs: number;
  totalCostUsd: number;
  prowlCostUsd: number;
}> {
  const logs = await prisma.agentLog.findMany({
    where: { caseId, type: { in: ['metric'] } },
    orderBy: { createdAt: 'desc' },
  });

  // Parse metrics from agent logs (they're stored as JSON in metadata)
  let prowls = 0, promoted = 0, discarded = 0;
  let timeSavedMs = 0, totalCostUsd = 0, prowlCostUsd = 0;

  for (const log of logs) {
    const meta = log.metadata as Record<string, unknown> | null;
    if (!meta?.metricType) continue;

    switch (meta.metricType) {
      case 'prowl_promoted':
        prowls++;
        promoted++;
        timeSavedMs += (meta.latencyMs as number) || 0;
        break;
      case 'prowl_discarded':
        prowls++;
        discarded++;
        prowlCostUsd += (meta.costUsd as number) || 0;
        break;
      case 'api_call':
        totalCostUsd += (meta.costUsd as number) || 0;
        if (meta.speculative) prowlCostUsd += (meta.costUsd as number) || 0;
        break;
    }
  }

  return { prowls, promoted, discarded, timeSavedMs, totalCostUsd, prowlCostUsd };
}

/**
 * Get global pipeline summary (for dashboard)
 */
export async function getPipelineSummary(): Promise<PipelineSummary> {
  // Aggregate from all metric events in the DB
  // For now, return from in-memory buffer + historical DB data
  const promotedCount = eventBuffer.filter(e => e.type === 'prowl_promoted').length;
  const discardedCount = eventBuffer.filter(e => e.type === 'prowl_discarded').length;
  const totalProwls = promotedCount + discardedCount;

  return {
    totalCases: 0, // TODO: query from DB
    avgPipelineTimeMs: 0,
    avgTimeSavedMs: 0,
    prowlAccuracy: totalProwls > 0 ? promotedCount / totalProwls : 0,
    sentinelAccuracy: 0,
    avgCostPerCase: 0,
    avgProwlCostPerCase: 0,
    stageBreakdown: {},
  };
}

// ─── Internal ────────────────────────────────────────────────────

function pushEvent(event: MetricEvent): void {
  eventBuffer.push(event);

  // Flush if buffer is full
  if (eventBuffer.length >= MAX_BUFFER_SIZE) {
    flushToDatabase().catch(console.error);
  }
}

async function flushToDatabase(): Promise<void> {
  if (eventBuffer.length === 0) return;

  const events = eventBuffer.splice(0); // drain buffer

  // Store as agent_log entries with type='metric'
  await prisma.agentLog.createMany({
    data: events.map(e => ({
      caseId: e.caseId,
      stage: e.stage,
      type: 'metric',
      message: `${e.type}: ${e.stage}`,
      metadata: {
        metricType: e.type,
        model: e.model,
        tokensUsed: e.tokensUsed,
        costUsd: e.costUsd,
        latencyMs: e.latencyMs,
        ...e.metadata,
      },
    })),
  }).catch((err) => {
    console.error('[Metrics] Failed to flush:', err);
    // Put events back in buffer on failure
    eventBuffer.unshift(...events);
  });
}

// Start periodic flush
export function startMetricsFlush(): void {
  setInterval(() => {
    flushToDatabase().catch(console.error);
  }, FLUSH_INTERVAL_MS);
}
