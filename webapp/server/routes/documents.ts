import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

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

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(new Error(`File type not allowed: ${ext}`));
      return;
    }
    cb(null, true);
  },
});

const uuidParam = z.string().uuid();

// POST /api/cases/:id/documents
router.post('/:id/documents', upload.array('files', 20), async (req: AuthRequest, res: Response) => {
  if (!uuidParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const files = req.files as Express.Multer.File[];
  if (!files?.length) { res.status(400).json({ error: 'No files uploaded' }); return; }
  const docs = await Promise.all(
    files.map((f) =>
      prisma.document.create({
        data: {
          caseId: req.params.id,
          filename: f.originalname,
          filepath: f.path,
          sizeBytes: f.size,
          pageCount: Math.max(1, Math.floor(f.size / 3000)),
        },
      })
    )
  );
  res.status(201).json({ documents: docs });
});

// GET /api/cases/:id/documents
router.get('/:id/documents', async (req: AuthRequest, res: Response) => {
  if (!uuidParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const docs = await prisma.document.findMany({ where: { caseId: req.params.id }, orderBy: { uploadedAt: 'desc' } });
  res.json({ documents: docs });
});

export default router;
