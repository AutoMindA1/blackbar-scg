import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

// pdf-parse v2 dropped the v1 default-function export and ships a `PDFParse`
// class with `.getInfo()` returning an `InfoResult` whose `total` is the
// page count. The prior shim (`mod.default ?? mod`) was for v1; v2 has
// neither shape, hence the runtime "pdfParse is not a function" error.
async function extractPdfPageCount(filepath: string): Promise<number | null> {
  let parser: { destroy: () => Promise<void> } | null = null;
  try {
    const { PDFParse } = await import('pdf-parse');
    const buf = await fs.readFile(filepath);
    parser = new PDFParse({ data: new Uint8Array(buf) });
    const info = await (parser as unknown as { getInfo: () => Promise<{ total: number }> }).getInfo();
    return typeof info.total === 'number' ? info.total : null;
  } catch (err) {
    console.warn(`[documents] pdf-parse failed for ${filepath}:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    if (parser) {
      try { await parser.destroy(); } catch { /* ignore cleanup errors */ }
    }
  }
}

const router = Router();
router.use(authMiddleware);

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

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname).toLowerCase()}`),
});

// Extension-to-MIME mapping for strict validation
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

const upload = multer({
  storage,
  // 200MB per file: forensic depositions / expert reports with embedded
  // exhibits routinely exceed 25MB. Per-case 50-doc cap (below) bounds total.
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(new Error(`File type not allowed: ${ext}`));
      return;
    }
    // Verify extension matches MIME type
    const allowedMimes = EXT_MIME_MAP[ext];
    if (allowedMimes && !allowedMimes.includes(file.mimetype)) {
      cb(new Error(`MIME type ${file.mimetype} does not match extension ${ext}`));
      return;
    }
    cb(null, true);
  },
});

const caseIdParam = z.string().min(1).max(100);

// POST /api/cases/:id/documents — max 50 files per request (matches per-case cap)
router.post('/:id/documents', upload.array('files', 50), async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const files = req.files as Express.Multer.File[];
  if (!files?.length) { res.status(400).json({ error: 'No files uploaded' }); return; }

  // Per-case document limit
  const existingCount = await prisma.document.count({ where: { caseId: req.params.id } });
  if (existingCount >= 50) {
    res.status(400).json({ error: 'Document limit reached for this case (max 50)' });
    return;
  }
  if (existingCount + files.length > 50) {
    res.status(400).json({ error: `Adding ${files.length} files would exceed the 50-document limit (currently ${existingCount})` });
    return;
  }

  const docs = await Promise.all(
    files.map(async (f) => {
      // Real page count for PDFs; size-based heuristic fallback for other types
      let pageCount: number | null = null;
      const ext = path.extname(f.originalname).toLowerCase();
      if (ext === '.pdf') {
        pageCount = await extractPdfPageCount(f.path);
      }
      if (pageCount === null) {
        pageCount = Math.max(1, Math.floor(f.size / 3000));
      }
      return prisma.document.create({
        data: {
          caseId: req.params.id,
          filename: f.originalname,
          filepath: f.path,
          sizeBytes: f.size,
          pageCount,
        },
      });
    })
  );
  res.status(201).json({ documents: docs });
});

// GET /api/cases/:id/documents
router.get('/:id/documents', async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const docs = await prisma.document.findMany({ where: { caseId: req.params.id }, orderBy: { uploadedAt: 'desc' } });
  res.json({ documents: docs });
});

export default router;
