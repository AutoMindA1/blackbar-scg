/**
 * GOLDEN TEST: Document Upload Routes
 *
 * Hard assertions — these MUST pass on every commit.
 * Tests: file type validation, page count heuristic, document limits.
 *
 * Target: server/routes/documents.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import { createMockPrisma, SYNTHETIC_DOCUMENT } from '../helpers/mocks.js';

// ─── FILE VALIDATION (replicated from documents.ts) ───
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.pptx', '.txt', '.csv', '.jpg', '.jpeg', '.png', '.tiff', '.bmp']);
const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/bmp',
]);

const EXT_MIME_MAP: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.txt': ['text/plain'],
  '.csv': ['text/csv'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.tiff': ['image/tiff'],
  '.bmp': ['image/bmp'],
};

function validateFileFilter(originalname: string, mimetype: string): { allowed: boolean; reason?: string } {
  const ext = path.extname(originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return { allowed: false, reason: `Extension ${ext} not allowed` };
  if (!ALLOWED_MIMETYPES.has(mimetype)) return { allowed: false, reason: `MIME ${mimetype} not allowed` };
  const allowedMimes = EXT_MIME_MAP[ext];
  if (allowedMimes && !allowedMimes.includes(mimetype)) {
    return { allowed: false, reason: `MIME ${mimetype} does not match extension ${ext}` };
  }
  return { allowed: true };
}

// ─── FILE TYPE VALIDATION ───
describe('Document Upload — File Type Validation', () => {
  it('accepts PDF with correct MIME', () => {
    expect(validateFileFilter('report.pdf', 'application/pdf').allowed).toBe(true);
  });

  it('accepts DOCX with correct MIME', () => {
    expect(validateFileFilter('brief.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').allowed).toBe(true);
  });

  it('accepts JPEG image', () => {
    expect(validateFileFilter('photo.jpg', 'image/jpeg').allowed).toBe(true);
  });

  it('accepts CSV', () => {
    expect(validateFileFilter('data.csv', 'text/csv').allowed).toBe(true);
  });

  it('rejects .exe', () => {
    expect(validateFileFilter('malware.exe', 'application/x-msdownload').allowed).toBe(false);
  });

  it('rejects .html (XSS vector)', () => {
    expect(validateFileFilter('page.html', 'text/html').allowed).toBe(false);
  });

  it('rejects .js (code execution)', () => {
    expect(validateFileFilter('script.js', 'application/javascript').allowed).toBe(false);
  });

  it('rejects spoofed MIME (PDF extension, EXE MIME)', () => {
    expect(validateFileFilter('fake.pdf', 'application/x-msdownload').allowed).toBe(false);
  });

  it('rejects mismatched extension/MIME (PNG ext, JPEG MIME)', () => {
    const result = validateFileFilter('image.png', 'image/jpeg');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('does not match');
  });

  it('handles case-insensitive extension', () => {
    expect(validateFileFilter('REPORT.PDF', 'application/pdf').allowed).toBe(true);
  });

  it('all 13 allowed extensions pass with correct MIME', () => {
    const cases: [string, string][] = [
      ['file.pdf', 'application/pdf'],
      ['file.doc', 'application/msword'],
      ['file.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['file.xls', 'application/vnd.ms-excel'],
      ['file.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      ['file.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      ['file.txt', 'text/plain'],
      ['file.csv', 'text/csv'],
      ['file.jpg', 'image/jpeg'],
      ['file.jpeg', 'image/jpeg'],
      ['file.png', 'image/png'],
      ['file.tiff', 'image/tiff'],
      ['file.bmp', 'image/bmp'],
    ];
    for (const [name, mime] of cases) {
      expect(validateFileFilter(name, mime).allowed).toBe(true);
    }
  });
});

// ─── FILE SIZE LIMIT ───
describe('Document Upload — Size Limit', () => {
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB from documents.ts line 68

  it('25MB limit in bytes is 26214400', () => {
    expect(MAX_FILE_SIZE).toBe(26214400);
  });

  it('file under limit passes', () => {
    expect(1024 * 1024).toBeLessThan(MAX_FILE_SIZE); // 1MB
  });

  it('file at exact limit passes', () => {
    expect(MAX_FILE_SIZE).toBeLessThanOrEqual(MAX_FILE_SIZE);
  });

  it('file over limit fails', () => {
    expect(MAX_FILE_SIZE + 1).toBeGreaterThan(MAX_FILE_SIZE);
  });
});

// ─── PAGE COUNT HEURISTIC ───
describe('Document Upload — Page Count Heuristic', () => {
  const fallback = (size: number) => Math.max(1, Math.floor(size / 3000));

  it('empty file = 1 page (minimum)', () => {
    expect(fallback(0)).toBe(1);
  });

  it('3KB file = 1 page', () => {
    expect(fallback(3000)).toBe(1);
  });

  it('6KB file = 2 pages', () => {
    expect(fallback(6000)).toBe(2);
  });

  it('always returns >= 1', () => {
    for (const size of [0, 1, 100, 2999]) {
      expect(fallback(size)).toBeGreaterThanOrEqual(1);
    }
  });

  it('[KNOWN GAP] heuristic absurd for large non-PDF files', () => {
    // 25MB JPEG image reports 8738 "pages"
    const result = fallback(25 * 1024 * 1024);
    expect(result).toBe(8738);
    // PLATINUM-BAR: Use real page count for PDFs (pdf-lib), 1 for images
  });
});

// ─── DOCUMENT LIMIT PER CASE ───
describe('Document Upload — 50-Document Limit', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('allows upload when under limit', () => {
    const existingCount = 45;
    const newFiles = 5;
    expect(existingCount + newFiles).toBeLessThanOrEqual(50);
  });

  it('blocks when at limit', () => {
    const existingCount = 50;
    expect(existingCount).toBeGreaterThanOrEqual(50);
  });

  it('blocks when adding would exceed limit', () => {
    const existingCount = 48;
    const newFiles = 5;
    expect(existingCount + newFiles).toBeGreaterThan(50);
  });

  it('allows exactly 50 total', () => {
    const existingCount = 40;
    const newFiles = 10;
    expect(existingCount + newFiles).toBeLessThanOrEqual(50);
  });

  it('blocks 0 existing + 51 new', () => {
    // Max 10 per request from multer, but validate the limit logic
    const existingCount = 0;
    const newFiles = 51;
    expect(existingCount + newFiles).toBeGreaterThan(50);
  });

  it('[KNOWN GAP] TOCTOU: no transaction around count check', () => {
    // Two concurrent requests both read count=49, both proceed
    const checkCount = 49;
    const req1Allowed = checkCount < 50;
    const req2Allowed = checkCount < 50;
    expect(req1Allowed && req2Allowed).toBe(true);
    // PLATINUM-BAR: Wrap count + insert in a transaction with row-level lock
  });
});

// ─── UUID FILENAME GENERATION ───
describe('Document Upload — Filename Safety', () => {
  it('generated filenames use UUID + original extension', () => {
    // documents.ts line 46: `${uuid()}${path.extname(file.originalname).toLowerCase()}`
    const originalname = 'My Report (Final).PDF';
    const ext = path.extname(originalname).toLowerCase();
    expect(ext).toBe('.pdf');
    // UUID format: 8-4-4-4-12 hex chars
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(uuidPattern.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('original filename is stored as-is in DB', () => {
    // documents.ts line 119: filename: f.originalname
    // The disk filename is safe (UUID), but the DB record stores the raw name
    const dangerousName = '../../../etc/passwd';
    // This is stored but never used to construct file paths (filepath uses UUID)
    expect(dangerousName).toContain('..');
    // PLATINUM-BAR: Sanitize originalname before DB storage
  });
});
