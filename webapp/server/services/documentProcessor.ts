/**
 * documentProcessor.ts — Extract text content from uploaded documents
 * and store it in the Document record for agent context injection.
 *
 * Supported formats:
 *   - PDF  → dynamic import('pdf-parse')
 *   - TXT / CSV → fs.readFile (utf-8)
 *   - Everything else → marked "unsupported"
 */

import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../db.js';

/** Maximum characters stored per document (100 K). */
const MAX_CONTENT_LENGTH = 100_000;

// ---------------------------------------------------------------------------
// PDF text extraction (mirrors the CJS dynamic-import pattern in documents.ts)
// ---------------------------------------------------------------------------

interface PdfData {
  numpages: number;
  text: string;
}

async function extractPdfText(filepath: string): Promise<string> {
  const mod = await import('pdf-parse');
  const pdfParse = (mod as { default?: (b: Buffer) => Promise<PdfData> }).default
    ?? (mod as unknown as (b: Buffer) => Promise<PdfData>);
  const buf = await fs.readFile(filepath);
  const data = await pdfParse(buf);
  return data.text ?? '';
}

// ---------------------------------------------------------------------------
// Single-document processing
// ---------------------------------------------------------------------------

export async function processDocument(documentId: string): Promise<void> {
  let doc: { id: string; filepath: string; filename: string; mimeType: string | null } | null;

  try {
    doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, filepath: true, filename: true, mimeType: true },
    });
  } catch (err) {
    console.warn('[documentProcessor] Failed to query document — Prisma model may not exist yet:', err instanceof Error ? err.message : err);
    return;
  }

  if (!doc) {
    console.warn(`[documentProcessor] Document ${documentId} not found`);
    return;
  }

  // Mark as processing
  try {
    await prisma.document.update({
      where: { id: doc.id },
      data: { extractionStatus: 'processing' },
    });
  } catch {
    // non-fatal — continue extraction
  }

  const ext = path.extname(doc.filename).toLowerCase();

  try {
    let content: string | null = null;

    if (ext === '.pdf') {
      content = await extractPdfText(doc.filepath);
    } else if (ext === '.txt' || ext === '.csv') {
      content = await fs.readFile(doc.filepath, 'utf-8');
    } else {
      // Unsupported format
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          extractionStatus: 'unsupported',
          content: null,
          extractedAt: new Date(),
        },
      });
      console.log(`[documentProcessor] Document ${doc.id} (${ext}) marked as unsupported`);
      return;
    }

    // Truncate to limit
    if (content && content.length > MAX_CONTENT_LENGTH) {
      content = content.slice(0, MAX_CONTENT_LENGTH);
      console.log(`[documentProcessor] Document ${doc.id} truncated to ${MAX_CONTENT_LENGTH} chars`);
    }

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        content,
        extractionStatus: 'ready',
        extractedAt: new Date(),
      },
    });

    console.log(`[documentProcessor] Document ${doc.id} processed — ${content?.length ?? 0} chars extracted`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[documentProcessor] Extraction failed for ${doc.id}:`, message);

    try {
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          extractionStatus: 'failed',
          extractedAt: new Date(),
        },
      });
    } catch (updateErr) {
      console.warn('[documentProcessor] Failed to mark document as failed:', updateErr instanceof Error ? updateErr.message : updateErr);
    }
  }
}

// ---------------------------------------------------------------------------
// Batch processing — all pending documents for a case
// ---------------------------------------------------------------------------

export async function processAllPending(
  caseId: string,
): Promise<{ processed: number; failed: number }> {
  let docs: { id: string }[];

  try {
    docs = await prisma.document.findMany({
      where: { caseId, extractionStatus: 'pending' },
      select: { id: true },
    });
  } catch (err) {
    console.warn('[documentProcessor] Failed to query pending documents:', err instanceof Error ? err.message : err);
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const doc of docs) {
    await processDocument(doc.id);

    // Re-read to check outcome
    try {
      const updated = await prisma.document.findUnique({
        where: { id: doc.id },
        select: { extractionStatus: true },
      });
      if (updated?.extractionStatus === 'ready') {
        processed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  console.log(`[documentProcessor] processAllPending(${caseId}): ${processed} processed, ${failed} failed out of ${docs.length} pending`);
  return { processed, failed };
}

// ---------------------------------------------------------------------------
// Content aggregation — concatenated text for agent context
// ---------------------------------------------------------------------------

export async function getDocumentContent(caseId: string): Promise<string> {
  let docs: { filename: string; content: string | null }[];

  try {
    docs = await prisma.document.findMany({
      where: { caseId, extractionStatus: 'ready' },
      select: { filename: true, content: true },
      orderBy: { uploadedAt: 'asc' },
    });
  } catch (err) {
    console.warn('[documentProcessor] Failed to query document content:', err instanceof Error ? err.message : err);
    return '';
  }

  if (docs.length === 0) return '';

  const parts: string[] = [];

  for (const doc of docs) {
    if (!doc.content) continue;
    parts.push(`--- ${doc.filename} ---`);
    parts.push(doc.content);
    parts.push('');
  }

  return parts.join('\n');
}
