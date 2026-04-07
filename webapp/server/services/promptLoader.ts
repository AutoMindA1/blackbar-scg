import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

// Resolve paths — env var override or default to project root
const VOICE_PATH = process.env.VOICE_MD_PATH
  ? path.resolve(process.env.VOICE_MD_PATH)
  : path.join(PROJECT_ROOT, 'VOICE.md');

const BRAIN_PATH = process.env.BRAIN_MD_PATH
  ? path.resolve(process.env.BRAIN_MD_PATH)
  : path.join(PROJECT_ROOT, 'ENTERPRISE_BRAIN.md');

const AGENT_SPECS_DIR = process.env.AGENT_SPECS_DIR
  ? path.resolve(process.env.AGENT_SPECS_DIR)
  : path.join(PROJECT_ROOT, 'agents');

let voiceCache: string | null = null;
let brainCache: string | null = null;
const specCache: Map<string, string | null> = new Map();

function loadVoice(): string {
  if (!voiceCache) {
    voiceCache = fs.readFileSync(VOICE_PATH, 'utf-8');
    console.log(`[promptLoader] Loaded VOICE.md (${voiceCache.length} chars) from ${VOICE_PATH}`);
  }
  return voiceCache;
}

function loadBrain(): string {
  if (!brainCache) {
    brainCache = fs.readFileSync(BRAIN_PATH, 'utf-8');
    console.log(`[promptLoader] Loaded ENTERPRISE_BRAIN.md (${brainCache.length} chars) from ${BRAIN_PATH}`);
  }
  return brainCache;
}

// Load the BlackBar-{Stage}.md spec for a stage. Returns null if missing on disk.
function loadAgentSpec(stage: string): string | null {
  if (specCache.has(stage)) return specCache.get(stage) ?? null;

  const stageCapitalized = stage.charAt(0).toUpperCase() + stage.slice(1);
  const specPath = path.join(AGENT_SPECS_DIR, stage, `BlackBar-${stageCapitalized}.md`);

  try {
    const content = fs.readFileSync(specPath, 'utf-8');
    specCache.set(stage, content);
    console.log(`[promptLoader] Loaded ${stage} agent spec (${content.length} chars) from ${specPath}`);
    return content;
  } catch (err) {
    console.warn(`[promptLoader] Agent spec missing for stage="${stage}" at ${specPath}; falling back to STAGE_INSTRUCTIONS. (${err instanceof Error ? err.message : err})`);
    specCache.set(stage, null);
    return null;
  }
}

// Extract specific sections from ENTERPRISE_BRAIN.md by section number
function extractBrainSections(sectionRefs: string[]): string {
  const brain = loadBrain();
  const sections: string[] = [];

  for (const ref of sectionRefs) {
    // Parse "§3 Case Taxonomy" → section number 3
    const match = ref.match(/§(\d+)/);
    if (!match) continue;
    const sectionNum = match[1];

    // Find the section header (## N. TITLE) and extract until next ## or end
    const headerPattern = new RegExp(`^## ${sectionNum}\\.\\s+.+$`, 'm');
    const headerMatch = brain.match(headerPattern);
    if (!headerMatch || headerMatch.index === undefined) continue;

    const start = headerMatch.index;
    const nextHeader = brain.indexOf('\n## ', start + headerMatch[0].length);
    const end = nextHeader === -1 ? brain.length : nextHeader;
    sections.push(brain.slice(start, end).trim());
  }

  return sections.join('\n\n---\n\n');
}

// Per-stage structured-output contracts. Appended to every system prompt so
// the agent's final response always ends with a parseable JSON summary block
// matching the interface in webapp/server/types/agentContracts.ts.
const STAGE_OUTPUT_CONTRACTS: Record<string, string> = {
  intake: `## OUTPUT CONTRACT (REQUIRED)
After your prose analysis, end your response with a single fenced JSON block matching this schema EXACTLY. The block must be the LAST thing in your response. Do not wrap it in commentary.

\`\`\`json
{
  "documents": [
    { "name": "string", "type": "deposition|expert_report|code_standard|photograph|contract|correspondence|other", "pages": 0 }
  ],
  "flags": ["string"],
  "missingFields": ["string"],
  "caseType": "string",
  "reportType": "string"
}
\`\`\``,

  research: `## OUTPUT CONTRACT (REQUIRED)
After your prose analysis, end your response with a single fenced JSON block matching this schema EXACTLY. The block must be the LAST thing in your response.

\`\`\`json
{
  "findings": [
    {
      "id": "F-1",
      "opposingClaim": "string",
      "codeReference": "string",
      "reasoning": "string",
      "attackPattern": "ATK-XX",
      "sourceDocument": "string",
      "sourcePage": 0
    }
  ],
  "standardsReferenced": ["string"],
  "attackPatternsUsed": ["ATK-XX"]
}
\`\`\``,

  drafting: `## OUTPUT CONTRACT (REQUIRED)
After drafting the report, end your response with a single fenced JSON block matching this schema EXACTLY. The block must be the LAST thing in your response.

\`\`\`json
{
  "sections": [
    { "title": "string", "wordCount": 0, "hasPlaceholders": false }
  ],
  "totalWordCount": 0,
  "placeholders": ["string"],
  "voiceScore": 0,
  "benchmarkUsed": "string"
}
\`\`\``,

  qa: `## OUTPUT CONTRACT (REQUIRED)
After your QA pass, end your response with a single fenced JSON block matching this schema EXACTLY. The block must be the LAST thing in your response.

\`\`\`json
{
  "score": 0,
  "benchmarkMatch": 0,
  "checks": [
    { "name": "string", "status": "pass|warning|fail", "detail": "string" }
  ],
  "issues": [
    { "severity": "critical|warning|info", "description": "string", "location": "string" }
  ]
}
\`\`\``,
};

// Brain section mapping per agent stage (from audit)
const STAGE_BRAIN_REFS: Record<string, string[]> = {
  intake: ['§3 Case Taxonomy', '§4 Report Types', '§8 Code Citation', '§2 Personnel'],
  research: ['§6 Attack Patterns', '§8 Standards & Codes', '§10 Known Adversary', '§9 Instruments'],
  drafting: ['§5 Voice Rules', '§7 Standard Blocks', '§4 Report Structure', '§12 Format Rules'],
  qa: ['§11 Benchmark Cases', '§5 Prohibited Terms', '§5 Identity/Date', '§12 Format Rules'],
};

// Stage-specific instructions appended to system prompt
const STAGE_INSTRUCTIONS: Record<string, string> = {
  intake: `You are the BlackBar Intake Agent. Your task is to:
1. Classify the case type (slip_fall, trip_fall, stairs, construction_defect, etc.)
2. Confirm jurisdiction from the documents
3. Determine report type (initial, rebuttal, supplemental)
4. Identify the opposing expert and flag if they are a known adversary
5. Extract key dates (use European format per VOICE.md: "2 February 2026")
6. Catalog all uploaded documents with page counts

Output a structured intake summary. Flag anything requiring human review.
Stream your progress as you work through each step.`,

  research: `You are the BlackBar Research Agent. Your task is to:
1. Analyze the opposing expert's report for rebuttal vectors
2. Match attack patterns from the Enterprise Brain (ATK-01 through ATK-12)
3. Catalog all applicable codes and standards with edition years
4. Identify instrumentation gaps in opposing analysis
5. If opposing expert is a known adversary, deploy their specific playbook
6. Build a citation catalog with all codes, standards, and references

Output structured findings with attack pattern IDs, confidence scores, and citations.
Stream each finding as you discover it.`,

  drafting: `You are the BlackBar Drafting Agent. Your task is to:
1. Draft the report in SCG's entity voice (NEVER "I" in body — always "SCG" or "Swainston Consulting Group")
2. Follow the standard section sequence from the report type template
3. Insert standard blocks (BLK-QA, BLK-01, BLK-02, BLK-09, BLK-CL) where applicable
4. Use European date format throughout
5. Apply certainty language per Voice rules in Points of Opinion
6. Format per Brain §12: underlined headers, proper figure captions, semicolons in lists

Output the draft as HTML sections. Maintain print-grade typography.
Stream section completions as you draft.`,

  qa: `You are the BlackBar QA Agent. Your task is to:
1. Scan for ALL prohibited terms (see Voice §11): "negligent", "prior to", "I" in body, "victim", "dangerous condition", etc.
2. Verify entity voice consistency — no unauthorized first person
3. Check all dates are European format
4. Verify format rules: underlined headers, figure captions, footnotes
5. Run benchmark comparison against filed reports (Gleason, Heagy, Anderson)
6. Score the draft 0-100 based on voice fidelity, format compliance, and content completeness

Output a QA scorecard with check results, flagged issues with locations, and suggested fixes.
Stream each check as you complete it.`,
};

export function buildSystemPrompt(stage: string): string {
  const voice = loadVoice();
  const brainRefs = STAGE_BRAIN_REFS[stage];
  if (!brainRefs) throw new Error(`Unknown stage: ${stage}`);

  const brainSections = extractBrainSections(brainRefs);
  const agentSpec = loadAgentSpec(stage);
  const fallbackInstructions = STAGE_INSTRUCTIONS[stage];

  // Prefer the full BlackBar-{Stage}.md spec when available; fall back to the
  // hardcoded STAGE_INSTRUCTIONS string if the spec file is missing on disk.
  const playbook = agentSpec
    ? `## AGENT PLAYBOOK (agents/${stage}/BlackBar-${stage.charAt(0).toUpperCase() + stage.slice(1)}.md)
Follow this playbook exactly. It defines your identity, inputs, audit/output protocol, and escalation rules.

${agentSpec}`
    : fallbackInstructions;

  return `You are the BlackBar ${stage} agent in a 4-stage forensic expert witness rebuttal pipeline for Swainston Consulting Group (SCG). Stream your progress as you work. Ground every output in the Voice Profile and Enterprise Brain below.

---

${playbook}

---

## VOICE PROFILE (VOICE.md — full document)
Follow these voice and style rules exactly. Deviations will be caught by QA.

${voice}

---

## ENTERPRISE BRAIN (relevant sections for ${stage} stage)
Use this domain knowledge to ground your analysis. Do not invent facts — cite from this document.

${brainSections}

---

${STAGE_OUTPUT_CONTRACTS[stage] ?? ''}`;
}

export function getBrainQueries(stage: string): string[] {
  return STAGE_BRAIN_REFS[stage] || [];
}

/**
 * Load a single named prompt resource. Used by sentinel.ts and any other
 * service that needs the raw VOICE.md or ENTERPRISE_BRAIN.md content.
 *
 * Returns a Promise so callers can `await` it without caring whether the
 * underlying read is sync (cached) or async.
 */
export async function loadPrompt(kind: 'voice' | 'brain'): Promise<string> {
  if (kind === 'voice') return loadVoice();
  if (kind === 'brain') return loadBrain();
  throw new Error(`loadPrompt: unknown kind "${kind}"`);
}

// Invalidate cache (for hot-reload in dev)
export function invalidateCache(): void {
  voiceCache = null;
  brainCache = null;
  specCache.clear();
}
