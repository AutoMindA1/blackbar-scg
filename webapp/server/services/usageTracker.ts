/**
 * usageTracker.ts — Track AI API usage per organization for the
 * "blast door" financial separation.
 *
 * Persists to the `usage_records` table via Prisma.
 * All public functions are fire-and-forget safe (never throw).
 */

import { prisma } from '../db.js';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface UsageParams {
  orgId: string;
  caseId?: string;
  stage?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostCents: number;
  byModel: Record<string, { inputTokens: number; outputTokens: number; costCents: number }>;
  byStage: Record<string, { inputTokens: number; outputTokens: number; costCents: number }>;
}

// ---------------------------------------------------------------------------
// Pricing table (USD per million tokens)
// ---------------------------------------------------------------------------

interface ModelPricing {
  inputPerMTok: number;
  outputPerMTok: number;
}

const MODEL_PRICING: { pattern: RegExp; pricing: ModelPricing }[] = [
  { pattern: /^claude-opus-4-/,   pricing: { inputPerMTok: 15,   outputPerMTok: 75 } },
  { pattern: /^claude-sonnet-4-/, pricing: { inputPerMTok: 3,    outputPerMTok: 15 } },
  { pattern: /^claude-haiku-4-/,  pricing: { inputPerMTok: 0.80, outputPerMTok: 4 } },
];

const DEFAULT_PRICING: ModelPricing = { inputPerMTok: 5, outputPerMTok: 25 };

function getPricing(model: string): ModelPricing {
  for (const entry of MODEL_PRICING) {
    if (entry.pattern.test(model)) return entry.pricing;
  }
  return DEFAULT_PRICING;
}

/**
 * Calculate cost in cents from token counts and model pricing.
 * Formula: tokens / 1_000_000 * $/MTok * 100 (to convert dollars to cents)
 */
function calculateCostCents(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing,
): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMTok * 100;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMTok * 100;
  return Math.round(inputCost + outputCost);
}

// ---------------------------------------------------------------------------
// Track usage (fire-and-forget)
// ---------------------------------------------------------------------------

export async function trackUsage(params: UsageParams): Promise<void> {
  try {
    const pricing = getPricing(params.model);
    const costCents = calculateCostCents(params.inputTokens, params.outputTokens, pricing);

    await prisma.usageRecord.create({
      data: {
        orgId: params.orgId,
        caseId: params.caseId ?? null,
        stage: params.stage ?? null,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costCents,
      },
    });

    console.log(
      `[usageTracker] Recorded usage — org=${params.orgId} model=${params.model} ` +
      `in=${params.inputTokens} out=${params.outputTokens} cost=${costCents}c`,
    );
  } catch (err) {
    console.warn(
      '[usageTracker] Failed to persist usage record (table may not exist yet):',
      err instanceof Error ? err.message : err,
    );
  }
}

// ---------------------------------------------------------------------------
// Usage summary query
// ---------------------------------------------------------------------------

export async function getUsageSummary(
  orgId: string,
  startDate: Date,
  endDate: Date,
): Promise<UsageSummary> {
  const empty: UsageSummary = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostCents: 0,
    byModel: {},
    byStage: {},
  };

  let records: {
    model: string;
    stage: string | null;
    inputTokens: number;
    outputTokens: number;
    costCents: number;
  }[];

  try {
    records = await prisma.usageRecord.findMany({
      where: {
        orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        model: true,
        stage: true,
        inputTokens: true,
        outputTokens: true,
        costCents: true,
      },
    });
  } catch (err) {
    console.warn(
      '[usageTracker] Failed to query usage records (table may not exist yet):',
      err instanceof Error ? err.message : err,
    );
    return empty;
  }

  if (records.length === 0) return empty;

  const summary: UsageSummary = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostCents: 0,
    byModel: {},
    byStage: {},
  };

  for (const rec of records) {
    summary.totalInputTokens += rec.inputTokens;
    summary.totalOutputTokens += rec.outputTokens;
    summary.totalCostCents += rec.costCents;

    // Aggregate by model
    if (!summary.byModel[rec.model]) {
      summary.byModel[rec.model] = { inputTokens: 0, outputTokens: 0, costCents: 0 };
    }
    summary.byModel[rec.model].inputTokens += rec.inputTokens;
    summary.byModel[rec.model].outputTokens += rec.outputTokens;
    summary.byModel[rec.model].costCents += rec.costCents;

    // Aggregate by stage
    const stageKey = rec.stage ?? 'unknown';
    if (!summary.byStage[stageKey]) {
      summary.byStage[stageKey] = { inputTokens: 0, outputTokens: 0, costCents: 0 };
    }
    summary.byStage[stageKey].inputTokens += rec.inputTokens;
    summary.byStage[stageKey].outputTokens += rec.outputTokens;
    summary.byStage[stageKey].costCents += rec.costCents;
  }

  return summary;
}
