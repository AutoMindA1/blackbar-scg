/**
 * BlackBar v2 Pipeline — Semantic Model Router
 *
 * Maps pipeline nodes to Claude model configurations based on task complexity.
 * Simple extraction tasks (ingestion, OCR) use Haiku for speed/cost.
 * Standard analysis (intake, research, QA compliance) uses Sonnet.
 * High-complexity drafting and adversarial QA can upgrade to Opus when
 * complexity flags justify the cost.
 *
 * Cost estimation uses Anthropic's published per-MTok pricing as of 2026-04.
 */

import type { ModelConfig } from '../types/caseState.js';
import type { IntakeResult, ResearchResult } from '../types/agentContracts.js';

// ─── Model Identifiers ─────────────────────────────────────────

const HAIKU = 'claude-haiku-4-5-20251001';
const SONNET = 'claude-sonnet-4-20250514';
const OPUS = 'claude-opus-4-6-20250414';

// ─── Pricing (USD per million tokens) ───────────────────────────

const PRICING: Record<string, { input: number; output: number }> = {
  [OPUS]:   { input: 15,   output: 75  },
  [SONNET]: { input: 3,    output: 15  },
  [HAIKU]:  { input: 0.80, output: 4   },
};

// ─── Complexity Flags That Trigger Opus Upgrade ─────────────────

const OPUS_UPGRADE_FLAGS = new Set([
  'HIGH_COMPLEXITY',
  'REBUTTAL',
  'PETERSON_ADVERSARY',
  'MULTI_JURISDICTION',
  'CONSTRUCTION_DEFECT',
]);

const OPUS_UPGRADE_THRESHOLD = 3;

// ─── Model Router ───────────────────────────────────────────────

/**
 * Select a model configuration for the given pipeline node.
 *
 * @param node - Pipeline node identifier (e.g., 'intake', 'drafting', 'qa_adversarial')
 * @param complexityFlags - Optional flags derived from upstream stage results
 * @returns ModelConfig with model ID, max tokens, and temperature
 */
export function routeModel(node: string, complexityFlags?: string[]): ModelConfig {
  const flags = complexityFlags ?? [];
  const forceOpus = flags.includes('FORCE_OPUS');

  let config: ModelConfig;

  switch (node) {
    case 'ingestion':
    case 'ocr':
      config = { model: HAIKU, maxTokens: 2048, temperature: 0 };
      break;

    case 'intake':
      config = { model: SONNET, maxTokens: 4096, temperature: 0 };
      break;

    case 'research':
      config = { model: SONNET, maxTokens: 4096, temperature: 0 };
      break;

    case 'drafting': {
      const upgradeFlagCount = flags.filter(f => OPUS_UPGRADE_FLAGS.has(f)).length;
      const shouldUpgrade = forceOpus || upgradeFlagCount >= OPUS_UPGRADE_THRESHOLD;
      const model = shouldUpgrade ? OPUS : SONNET;

      config = { model, maxTokens: 8192, temperature: 0.2 };

      if (shouldUpgrade) {
        console.log(
          `[modelRouter] Drafting upgraded to Opus — ${upgradeFlagCount} complexity flags: [${flags.filter(f => OPUS_UPGRADE_FLAGS.has(f)).join(', ')}]`,
        );
      }
      break;
    }

    case 'qa_compliance':
      config = { model: SONNET, maxTokens: 4096, temperature: 0 };
      break;

    case 'qa_adversarial': {
      const model = forceOpus ? OPUS : SONNET;
      config = { model, maxTokens: 8192, temperature: 0 };

      if (forceOpus) {
        console.log('[modelRouter] QA adversarial upgraded to Opus — FORCE_OPUS flag');
      }
      break;
    }

    default:
      config = { model: SONNET, maxTokens: 4096, temperature: 0 };
      break;
  }

  console.log(
    `[modelRouter] ${node} → ${config.model} (maxTokens=${config.maxTokens}, temp=${config.temperature})`,
  );

  return config;
}

// ─── Cost Estimation ────────────────────────────────────────────

/**
 * Estimate cost in cents for a given model and token usage.
 * Uses Anthropic's published pricing as of 2026-04.
 *
 * @param model - Model identifier string
 * @param inputTokens - Number of input tokens consumed
 * @param outputTokens - Number of output tokens generated
 * @returns Cost in US cents
 */
export function estimateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  // Find pricing — fall back to Sonnet if unknown model
  const pricing = PRICING[model] ?? PRICING[SONNET];

  const inputCostDollars = (inputTokens / 1_000_000) * pricing.input;
  const outputCostDollars = (outputTokens / 1_000_000) * pricing.output;
  const totalCents = (inputCostDollars + outputCostDollars) * 100;

  return Math.round(totalCents * 100) / 100; // round to 2 decimal places
}

// ─── Complexity Flag Derivation ─────────────────────────────────

/**
 * Derive complexity flags from upstream stage results.
 * These flags drive model selection in downstream stages (drafting, QA).
 *
 * @param intake - Parsed IntakeResult from the intake stage, or null
 * @param research - Parsed ResearchResult from the research stage, or null
 * @returns Array of complexity flag strings
 */
export function getComplexityFlags(
  intake: IntakeResult | null,
  research: ResearchResult | null,
): string[] {
  const flags: string[] = [];

  if (intake) {
    // Rebuttal reports are inherently adversarial — higher complexity
    if (intake.reportType === 'rebuttal') {
      flags.push('REBUTTAL');
    }

    // Known adversary experts that require Opus-level reasoning
    const petersonIndicators = [
      'peterson',
      'Peterson',
      'PETERSON',
    ];
    if (intake.flags.some(f => petersonIndicators.some(p => f.includes(p)))) {
      flags.push('PETERSON_ADVERSARY');
    }

    // Construction defect cases have complex code/standard interplay
    if (intake.caseType === 'construction_defect') {
      flags.push('CONSTRUCTION_DEFECT');
    }
  }

  if (research) {
    // Many findings indicate a complex case
    if (research.findings.length > 5) {
      flags.push('HIGH_COMPLEXITY');
    }

    // Many attack patterns used — broad analytical surface
    if (research.attackPatternsUsed.length > 4) {
      // Only add if not already present from findings check
      if (!flags.includes('HIGH_COMPLEXITY')) {
        flags.push('HIGH_COMPLEXITY');
      }
    }
  }

  if (flags.length > 0) {
    console.log(`[modelRouter] Complexity flags derived: [${flags.join(', ')}]`);
  }

  return flags;
}
