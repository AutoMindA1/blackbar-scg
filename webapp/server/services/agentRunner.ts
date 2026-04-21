import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../db.js';
import { buildSystemPrompt, getBrainQueries } from './promptLoader.js';
import { extractImageText, isImagePath } from './imageOCR.js';
import {
  AgentResult as TypedAgentResult,
  FALLBACKS,
  isDraftingResult,
  isIntakeResult,
  isQAResult,
  isResearchResult,
} from '../types/agentContracts.js';

const SUPERVISED_MODE = process.env.SUPERVISED_MODE === 'true';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface AgentBroadcast {
  type: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  stage: string;
}

/**
 * Shape consumed by prowl.ts / sentinel.ts when they wrap a speculative agent
 * run. The current `runAgent()` is fire-and-forget (returns void via SSE side
 * effects), so this interface describes the *future* refactor where prowl is
 * actually wired up. Today it exists so type-only imports compile cleanly.
 */
// Wrapper used by the (currently dormant) prowl/sentinel speculative-run path.
// Distinct from the per-stage TypedAgentResult union in
// ../types/agentContracts.ts, which describes the structured JSON each agent
// emits at the end of its response.
export interface AgentResult {
  output: unknown;
  stage?: string;
  caseId?: string;
  tokenUsage?: { input: number; output: number };
}

type BroadcastFn = (caseId: string, data: AgentBroadcast) => void;

// Build user prompt from case data, documents, and optional notes context
function buildUserPrompt(
  stage: string,
  caseData: { name: string; caseType: string | null; reportType: string | null; jurisdiction: string | null; opposingExpert: string | null },
  documents: { filename: string; pageCount: number | null; sizeBytes: number | null }[],
  feedback?: string,
  previousStageOutput?: string,
  notes?: string,
  imageExtracts?: { filename: string; text: string }[],
): string {
  const parts: string[] = [];

  parts.push(`## Case: ${caseData.name}`);
  if (caseData.caseType) parts.push(`Case Type: ${caseData.caseType}`);
  if (caseData.reportType) parts.push(`Report Type: ${caseData.reportType}`);
  if (caseData.jurisdiction) parts.push(`Jurisdiction: ${caseData.jurisdiction}`);
  if (caseData.opposingExpert) parts.push(`Opposing Expert: ${caseData.opposingExpert}`);

  if (documents.length > 0) {
    parts.push('\n## Uploaded Documents');
    for (const doc of documents) {
      parts.push(`- ${doc.filename} (${doc.pageCount ?? '?'} pages, ${doc.sizeBytes ? Math.round(doc.sizeBytes / 1024) + 'KB' : 'unknown size'})`);
    }
  }

  if (notes) {
    parts.push(`\n${notes}`);
  }

  if (imageExtracts && imageExtracts.length > 0) {
    parts.push('\n## Image Content (OCR — Claude vision extract)');
    parts.push('The following text was extracted from uploaded photographs. Cross-reference with documents and flag contradictions as findings.');
    for (const img of imageExtracts) {
      parts.push(`\n### ${img.filename}\n${img.text}`);
    }
  }

  if (previousStageOutput) {
    parts.push(`\n## Previous Stage Output\n${previousStageOutput}`);
  }

  if (feedback) {
    parts.push(`\n## Human Feedback (revision requested)\n${feedback}`);
  }

  parts.push(`\nProceed with the ${stage} analysis. Stream your progress as you work through each step.`);

  return parts.join('\n');
}

// Get the last complete output from a previous stage
async function getPreviousStageOutput(caseId: string, stage: string): Promise<string | undefined> {
  const stageOrder = ['intake', 'research', 'drafting', 'qa'];
  const currentIdx = stageOrder.indexOf(stage);
  if (currentIdx <= 0) return undefined;

  const prevStage = stageOrder[currentIdx - 1];
  const logs = await prisma.agentLog.findMany({
    where: { caseId, stage: prevStage },
    orderBy: { createdAt: 'asc' },
  });

  // Combine findings and complete messages as context
  const relevant = logs
    .filter(l => l.type === 'finding' || l.type === 'complete')
    .map(l => l.message);

  return relevant.length > 0 ? relevant.join('\n') : undefined;
}

// QA scorecard schema emitted by the QA agent (see agents/qa/BlackBar-QA.md OUTPUT CONTRACT)
export interface QAScorecard {
  score: number;
  benchmarkMatch?: number;
  checks: { name: string; status: 'pass' | 'warning' | 'fail'; detail: string }[];
  issues: { severity: 'critical' | 'warning' | 'info'; description: string; location: string }[];
}

// Extract the trailing fenced ```json ... ``` block from a QA agent response.
// Returns null if no parseable block is present.
export function parseQAScorecard(fullResponse: string): QAScorecard | null {
  // Find the LAST ```json ... ``` fence in the response (per contract: must be final)
  const fenceRegex = /```json\s*([\s\S]*?)```/gi;
  let lastMatch: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = fenceRegex.exec(fullResponse)) !== null) {
    lastMatch = m;
  }
  if (!lastMatch) return null;

  const jsonText = lastMatch[1].trim();
  try {
    const parsed = JSON.parse(jsonText);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.score === 'number' &&
      Array.isArray(parsed.checks) &&
      Array.isArray(parsed.issues)
    ) {
      return parsed as QAScorecard;
    }
    console.warn('[agentRunner] QA JSON parsed but failed schema validation:', Object.keys(parsed));
    return null;
  } catch (err) {
    console.warn('[agentRunner] Failed to parse QA JSON block:', err instanceof Error ? err.message : err);
    return null;
  }
}

// Generic structured-output parser for any pipeline stage.
//
// Looks for the LAST ```json fenced block in the agent's raw response,
// validates it against the per-stage interface in ../types/agentContracts.ts,
// and returns the parsed object. On any failure (no block, bad JSON, schema
// mismatch) returns the minimal valid fallback for that stage and logs an
// info message — never throws.
export function parseAgentOutput(stage: string, rawOutput: string): TypedAgentResult {
  const fallback = FALLBACKS[stage as keyof typeof FALLBACKS] ?? FALLBACKS.intake;

  // Find the LAST ```json ... ``` fence (per contract: must be the final block)
  const fenceRegex = /```json\s*([\s\S]*?)```/gi;
  let lastMatch: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = fenceRegex.exec(rawOutput)) !== null) {
    lastMatch = m;
  }

  if (!lastMatch) {
    console.info(`[agentRunner] ${stage}: agent output did not contain a JSON block — using fallback`);
    return fallback;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(lastMatch[1].trim());
  } catch (err) {
    console.info(`[agentRunner] ${stage}: agent output did not match expected schema (JSON parse failed: ${err instanceof Error ? err.message : err})`);
    return fallback;
  }

  let valid = false;
  switch (stage) {
    case 'intake':   valid = isIntakeResult(parsed); break;
    case 'research': valid = isResearchResult(parsed); break;
    case 'drafting': valid = isDraftingResult(parsed); break;
    case 'qa':       valid = isQAResult(parsed); break;
    default:         valid = false;
  }

  if (!valid) {
    console.info(`[agentRunner] ${stage}: agent output did not match expected schema — using fallback`);
    return fallback;
  }

  return parsed as TypedAgentResult;
}

function broadcast(broadcastFn: BroadcastFn, caseId: string, stage: string, type: string, message: string, metadata?: Record<string, unknown>) {
  const entry: AgentBroadcast = {
    type,
    message,
    timestamp: new Date().toISOString(),
    stage,
    ...(metadata ? { metadata } : {}),
  };
  broadcastFn(caseId, entry);
  return entry;
}

export async function runAgent(
  caseId: string,
  stage: string,
  broadcastFn: BroadcastFn,
  feedback?: string,
): Promise<void> {
  const brainQueries = getBrainQueries(stage);

  // Broadcast start
  broadcast(broadcastFn, caseId, stage, 'progress', `Loading ENTERPRISE_BRAIN.md — querying ${brainQueries[0] || stage}...`);
  await persistLog(caseId, stage, 'progress', `Agent started for ${stage}`);

  try {
    // Load case data
    const caseData = await prisma.case.findUniqueOrThrow({
      where: { id: caseId },
      include: { documents: true },
    });

    broadcast(broadcastFn, caseId, stage, 'progress', `Case loaded: ${caseData.name} — ${caseData.documents.length} documents`);

    // Load case notes for Intake (scoped to intake only — downstream stages receive
    // note-derived observations only if the intake agent phrased them as findings
    // matching the streaming keyword heuristic; raw note body does not propagate)
    let notesContext: string | undefined;
    if (stage === 'intake') {
      const caseNotes = await prisma.note.findMany({
        where: { caseId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      if (caseNotes.length > 0) {
        const lines = caseNotes.map((n, i) =>
          `Note ${i + 1} (${n.createdAt.toISOString().slice(0, 10)}): ${n.body}`
        );
        notesContext = `## Case Notes (${caseNotes.length} total)\nReview these alongside uploaded documents. Flag any contradictions or additional context relevant to case classification.\n${lines.join('\n')}`;
        broadcast(broadcastFn, caseId, stage, 'progress', `${caseNotes.length} case note${caseNotes.length === 1 ? '' : 's'} loaded`);
      }
    }

    // For Intake: run Claude vision OCR on image documents that haven't been extracted yet
    let imageExtracts: { filename: string; text: string }[] | undefined;
    if (stage === 'intake') {
      const imageDocs = caseData.documents.filter(
        (d) => isImagePath(d.filepath) && !d.extractedText,
      );
      if (imageDocs.length > 0) {
        broadcast(broadcastFn, caseId, stage, 'progress', `Running OCR on ${imageDocs.length} image${imageDocs.length === 1 ? '' : 's'}...`);
        const ocResults = await Promise.all(
          imageDocs.map(async (d) => {
            const text = await extractImageText(d.filepath);
            if (text) {
              await prisma.document.update({ where: { id: d.id }, data: { extractedText: text } });
            }
            return text ? { filename: d.filename, text } : null;
          }),
        );
        imageExtracts = ocResults.filter((r): r is { filename: string; text: string } => r !== null);
        if (imageExtracts.length > 0) {
          broadcast(broadcastFn, caseId, stage, 'finding', `Image OCR complete — extracted text from ${imageExtracts.length} image${imageExtracts.length === 1 ? '' : 's'}`);
        }
      }
    }

    // Build prompts
    const systemPrompt = buildSystemPrompt(stage);
    const previousOutput = await getPreviousStageOutput(caseId, stage);
    const userPrompt = buildUserPrompt(
      stage,
      caseData,
      caseData.documents,
      feedback,
      previousOutput,
      notesContext,
      imageExtracts,
    );

    broadcast(broadcastFn, caseId, stage, 'progress', `System prompt built (${Math.round(systemPrompt.length / 1000)}K chars) — calling Claude...`);

    // Stream from Claude
    const anthropic = getClient();
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let fullResponse = '';
    let chunkBuffer = '';
    let findingCount = 0;

    stream.on('text', (text) => {
      fullResponse += text;
      chunkBuffer += text;

      // Broadcast chunks at sentence boundaries for readable streaming
      if (chunkBuffer.includes('. ') || chunkBuffer.includes('.\n') || chunkBuffer.includes('\n\n')) {
        const sentences = chunkBuffer.split(/(?<=\.\s|\.\n|\n\n)/);
        // Keep the last incomplete fragment in the buffer
        chunkBuffer = sentences.pop() || '';

        for (const sentence of sentences) {
          const trimmed = sentence.trim();
          if (!trimmed) continue;

          // Detect findings vs progress from content
          const isFinding = /ATK-\d+|attack pattern|confidence|flagged|identified|found|matched/i.test(trimmed);

          if (isFinding) {
            findingCount++;
            const confMatch = trimmed.match(/(\d+)%/);
            broadcast(broadcastFn, caseId, stage, 'finding', trimmed, {
              confidence: confMatch ? parseInt(confMatch[1]) / 100 : undefined,
              findingIndex: findingCount,
            });
            persistLog(caseId, stage, 'finding', trimmed, { findingIndex: findingCount });
          } else {
            broadcast(broadcastFn, caseId, stage, 'progress', trimmed);
          }
        }
      }
    });

    // Wait for stream to complete
    const finalMessage = await stream.finalMessage();

    // Flush remaining buffer
    if (chunkBuffer.trim()) {
      broadcast(broadcastFn, caseId, stage, 'progress', chunkBuffer.trim());
    }

    // QA stage: parse the trailing JSON scorecard the QA agent is contracted to emit.
    // (see agents/qa/BlackBar-QA.md OUTPUT CONTRACT)
    let qaScorecard: QAScorecard | null = null;
    if (stage === 'qa') {
      qaScorecard = parseQAScorecard(fullResponse);
      if (qaScorecard) {
        console.log(`[agentRunner] QA scorecard parsed — score=${qaScorecard.score}, checks=${qaScorecard.checks.length}, issues=${qaScorecard.issues.length}`);
      } else {
        console.warn('[agentRunner] QA stage produced no parseable JSON scorecard. UI will show an empty state.');
      }
    }

    // Typed agent contract output (intake/research/drafting). For QA we keep
    // the existing parseQAScorecard path so the working /api/cases/:id/qa
    // endpoint and CaseQA UI do not regress.
    const parsedTyped: TypedAgentResult | null =
      stage === 'qa' ? null : parseAgentOutput(stage, fullResponse);

    const completeMessage = qaScorecard
      ? `qa complete — score ${qaScorecard.score}/100`
      : `${stage} complete — ${findingCount} findings`;

    const completeMetadata: Record<string, unknown> = {
      tokenUsage: {
        input: finalMessage.usage.input_tokens,
        output: finalMessage.usage.output_tokens,
      },
    };
    if (qaScorecard) completeMetadata.qa = qaScorecard;
    if (parsedTyped) completeMetadata.parsed = parsedTyped;

    // Persist the full response
    await persistLog(caseId, stage, 'complete', completeMessage, completeMetadata);

    // Persist full output for next stage to reference
    await prisma.agentLog.create({
      data: {
        caseId,
        stage,
        type: 'output',
        message: fullResponse.slice(0, 10000), // Trim to 10K for DB
        metadata: { fullLength: fullResponse.length },
      },
    });

    // Supervised mode: inject human input request for certain stages
    if (SUPERVISED_MODE && stage === 'research') {
      broadcast(broadcastFn, caseId, stage, 'human_input_needed',
        'Code edition lookup needed — which IBC edition applies to this jurisdiction and permit year?',
        { field: 'codeEdition' },
      );
    }

    // Broadcast structured QA scorecard so the UI can react in real time
    if (qaScorecard) {
      broadcast(broadcastFn, caseId, stage, 'qa_result',
        `QA scorecard ready — ${qaScorecard.score}/100 (${qaScorecard.checks.length} checks, ${qaScorecard.issues.length} issues)`,
        { qa: qaScorecard },
      );
    }

    // Broadcast completion
    broadcast(broadcastFn, caseId, stage, 'complete',
      qaScorecard
        ? `${capitalize(stage)} complete — ${qaScorecard.score}/100`
        : `${capitalize(stage)} complete — ${findingCount} findings identified`,
      {
        findingCount,
        tokenUsage: finalMessage.usage,
        ...(qaScorecard ? { qa: qaScorecard } : {}),
        ...(parsedTyped ? { parsed: parsedTyped } : {}),
      },
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown agent error';
    console.error(`[agentRunner] Error in ${stage} for case ${caseId}:`, message);
    broadcast(broadcastFn, caseId, stage, 'error', `Agent error: ${message}`);
    await persistLog(caseId, stage, 'error', message);
  }
}

async function persistLog(caseId: string, stage: string, type: string, message: string, metadata?: Record<string, unknown>) {
  // Prisma's JSON column accepts InputJsonValue; cast through unknown so the
  // generic Record<string, unknown> shape is accepted.
  await prisma.agentLog.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { caseId, stage, type, message, metadata: (metadata ?? undefined) as any },
  }).catch((err) => console.error('[agentRunner] Failed to persist log:', err));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
