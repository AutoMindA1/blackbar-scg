import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => cb(null, `${uuid()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/cases/:id/documents
router.post('/:id/documents', upload.array('files', 20), async (req: AuthRequest, res: Response) => {
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
          pageCount: Math.max(1, Math.floor(f.size / 3000)), // estimate
        },
      })
    )
  );
  res.status(201).json({ documents: docs });
});

// GET /api/cases/:id/documents
router.get('/:id/documents', async (req: AuthRequest, res: Response) => {
  const docs = await prisma.document.findMany({ where: { caseId: req.params.id }, orderBy: { uploadedAt: 'desc' } });
  res.json({ documents: docs });
});

export default router;
