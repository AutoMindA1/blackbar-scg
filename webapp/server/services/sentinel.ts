/**
 * BlackBar Sentinel Gate — Dual-Model Validation
 *
 * After a prowl produces a result with the fast model (Sonnet),
 * the Sentinel validates it with the smart model (Opus).
 *
 * This is the quality gate that makes prowl trustworthy:
 * - Fast model generates (cheap, aggressive, might miss voice nuance)
 * - Sentinel validates (expensive, precise, catches voice drift + legal risk)
 *
 * The Sentinel checks:
 * 1. Voice compliance — does the output sound like Lane wrote it?
 * 2. Factual accuracy — are citations and standards referenced correctly?
 * 3. Legal safety — no prohibited terms, no FRE 407 violations, no legal conclusions?
 * 4. Structural integrity — correct section order, formatting, entity voice?
 * 5. Attack pattern validity — are identified patterns real and defensible?
 *
 * If the Sentinel score falls below the threshold, the prowl result is discarded
 * and the stage runs fresh when Lane approves (using the smart model directly).
 *
 * The bear's sentinel stands guard.
 */

import Anthropic from '@anthropic-ai/sdk';
import { loadPrompt } from './promptLoader.js';
import type { AgentResult } from './agentRunner.js';

// ─── Types ───────────────────────────────────────────────────────

export interface SentinelResult {
  score: number;              // 0-100 overall confidence
  passed: boolean;            // score >= threshold
  checks: SentinelCheck[];    // individual check results
  reasoning: string;          // sentinel's explanation
  suggestedFixes?: string[];  // what to fix if rejected
  model: string;              // model used for validation
  tokensUsed: number;         // for cost tracking
  latencyMs: number;
}

export interface SentinelCheck {
  name: string;
  passed: boolean;
  score: number;       // 0-100 per check
  weight: number;      // contribution to overall score
  finding?: string;    // what the sentinel found (if failed)
}

// ─── Sentinel Checks by Stage ───────────────────────────────────

const STAGE_CHECKS: Record<string, Array<{ name: string; weight: number; prompt: string }>> = {
  intake: [
    { name: 'Case Classification', weight: 30, prompt: 'Is the case type correctly identified? Check against Brain §3 taxonomy.' },
    { name: 'Jurisdiction Accuracy', weight: 25, prompt: 'Is the jurisdiction correctly identified and the applicable code edition reasonable?' },
    { name: 'Opposing Expert Flag', weight: 25, prompt: 'Is the opposing expert correctly identified and matched against Brain §10 known adversary list?' },
    { name: 'Report Type', weight: 20, prompt: 'Is the report type (initial/rebuttal/supplemental) correctly determined from the engagement context?' },
  ],
  research: [
    { name: 'Attack Pattern Validity', weight: 30, prompt: 'Are the identified attack patterns (ATK-01 through ATK-10) correctly matched to evidence in the opposing report? No false positives?' },
    { name: 'Citation Accuracy', weight: 25, prompt: 'Are all cited standards (ANSI A326.3, NFSI B101, IBC, ADA/A117.1) correctly referenced with proper edition years?' },
    { name: 'Credential Verification', weight: 20, prompt: 'If opposing expert credentials were checked, is the result accurate? No false claims about expired certs?' },
    { name: 'Completeness', weight: 25, prompt: 'Are there obvious attack vectors or rebuttal opportunities that were missed? Check against Brain §6 full pattern list.' },
  ],
  drafting: [
    { name: 'Voice Compliance', weight: 35, prompt: 'Does the draft maintain SCG entity voice throughout? No unauthorized "I" or "we"? No prohibited terms from VOICE.md §11?' },
    { name: 'Legal Safety', weight: 25, prompt: 'No legal conclusions (negligent, fault, victim, causation)? No FRE 407/NRS 48.135 violations (subsequent remedial measures)? No absolute terms (clearly, obviously, undoubtedly)?' },
    { name: 'Block Insertion', weight: 20, prompt: 'Are standard opinion blocks (BLK-01, BLK-02, BLK-QA, BLK-CL, etc.) correctly inserted and unmodified from their templates?' },
    { name: 'Format Rules', weight: 20, prompt: 'European date format (2 February 2026)? Underlined section headers? Semicolons in Documentation Reviewed list? Justified text?' },
  ],
  qa: [
    { name: 'Score Accuracy', weight: 30, prompt: 'Is the QA score justified by the actual findings? No inflated scores hiding real issues?' },
    { name: 'Prohibited Term Scan', weight: 30, prompt: 'Were ALL prohibited terms from VOICE.md §11 actually scanned? Any false negatives?' },
    { name: 'Benchmark Comparison', weight: 20, prompt: 'Is the benchmark similarity claim accurate? Does the draft actually read like the referenced benchmark report?' },
    { name: 'Completeness', weight: 20, prompt: 'Are there quality issues the QA agent missed? Check date formats, entity voice, citation accuracy independently.' },
  ],
};

// ─── Core Function ───────────────────────────────────────────────

/**
 * Validate a prowl agent result using the sentinel (smart) model.
 */
export async function validateWithSentinel(
  caseId: string,
  stage: string,
  agentResult: AgentResult,
  sentinelModel: string,
): Promise<SentinelResult> {
  const startTime = Date.now();

  const checks = STAGE_CHECKS[stage];
  if (!checks) {
    return {
      score: 100,
      passed: true,
      checks: [],
      reasoning: 'No sentinel checks defined for this stage',
      model: sentinelModel,
      tokensUsed: 0,
      latencyMs: 0,
    };
  }

  // Load VOICE.md and BRAIN.md for the sentinel's context
  const voiceContext = await loadPrompt('voice');
  const brainContext = await loadPrompt('brain');

  // Build the sentinel prompt
  const systemPrompt = `You are the BlackBar Sentinel — the quality gate that validates AI-generated expert report content for Swainston Consulting Group.

Your job: evaluate the prowl output below and score it on specific criteria.

You have access to:
- The full VOICE.md rules: ${voiceContext}
- The full ENTERPRISE_BRAIN.md: ${brainContext}

For each check, provide:
- A score from 0-100
- Whether it passed (>= 70)
- A brief finding if it failed

Then provide an overall weighted score and your reasoning.

Respond in JSON format:
{
  "checks": [
    { "name": "Check Name", "score": 85, "passed": true, "finding": null },
    { "name": "Check Name", "score": 45, "passed": false, "finding": "What went wrong" }
  ],
  "overallScore": 78,
  "reasoning": "Overall assessment in 2-3 sentences",
  "suggestedFixes": ["Fix 1", "Fix 2"]
}`;

  const userPrompt = `Validate this ${stage} agent output for case ${caseId}:

--- AGENT OUTPUT ---
${JSON.stringify(agentResult.output, null, 2)}
--- END OUTPUT ---

Checks to perform:
${checks.map((c, i) => `${i + 1}. ${c.name} (weight: ${c.weight}%): ${c.prompt}`).join('\n')}

Score each check 0-100. Compute weighted overall score. Be strict — this is prowl output that will go directly to a forensic expert for review.`;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: sentinelModel,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    // Parse sentinel response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Sentinel response not valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const latencyMs = Date.now() - startTime;
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    const sentinelChecks: SentinelCheck[] = (parsed.checks || []).map((c: Record<string, unknown>, i: number) => ({
      name: String(c.name || checks[i]?.name || `Check ${i + 1}`),
      passed: (c.score as number) >= 70,
      score: c.score as number,
      weight: checks[i]?.weight || 25,
      finding: c.finding ? String(c.finding) : undefined,
    }));

    const overallScore = parsed.overallScore || computeWeightedScore(sentinelChecks);

    return {
      score: overallScore,
      passed: overallScore >= (parseInt(process.env.SENTINEL_THRESHOLD || '80', 10)),
      checks: sentinelChecks,
      reasoning: String(parsed.reasoning || 'No reasoning provided'),
      suggestedFixes: parsed.suggestedFixes as string[] | undefined,
      model: sentinelModel,
      tokensUsed,
      latencyMs,
    };

  } catch (err) {
    console.error('[Sentinel] Validation failed:', err);
    // On sentinel failure, return a conservative "fail" —
    // better to let Lane review than to auto-promote bad output
    return {
      score: 60,
      passed: false,
      checks: [],
      reasoning: `Sentinel validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      model: sentinelModel,
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function computeWeightedScore(checks: SentinelCheck[]): number {
  if (checks.length === 0) return 0;
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = checks.reduce((sum, c) => sum + (c.score * c.weight), 0);
  return Math.round(weightedSum / totalWeight);
}
