import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const uuidParam = z.string().uuid();
const updateReportSchema = z.object({
  content: z.string().max(500000),
});
const exportSchema = z.object({
  format: z.enum(['pdf', 'docx']),
});

// GET /api/cases/:id/report
router.get('/:id/report', async (req: AuthRequest, res: Response) => {
  if (!uuidParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const report = await prisma.report.findUnique({ where: { caseId: req.params.id } });
  if (!report) { res.status(404).json({ error: 'No report found' }); return; }
  res.json({ content: report.content, sections: report.sections, version: report.version });
});

// PUT /api/cases/:id/report
router.put('/:id/report', async (req: AuthRequest, res: Response) => {
  if (!uuidParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const parsed = updateReportSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  const { content } = parsed.data;
  const existing = await prisma.report.findUnique({ where: { caseId: req.params.id } });
  if (existing) {
    await prisma.report.update({
      where: { id: existing.id },
      data: { content, version: existing.version + 1 },
    });
  } else {
    await prisma.report.create({
      data: { caseId: req.params.id, content, version: 1 },
    });
  }
  res.json({ saved: true });
});

// POST /api/cases/:id/export
router.post('/:id/export', async (req: AuthRequest, res: Response) => {
  if (!uuidParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const parsed = exportSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Format must be pdf or docx' }); return; }
  const report = await prisma.report.findUnique({ where: { caseId: req.params.id } });
  const caseData = await prisma.case.findUnique({ where: { id: req.params.id } });
  if (!report || !caseData) { res.status(404).json({ error: 'No report found' }); return; }

  // Sanitize case name for filename
  const safeName = caseData.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const reportTypeLabel = caseData.reportType === 'initial' ? 'Initial Report' : caseData.reportType === 'rebuttal' ? 'Rebuttal Report' : 'Supplemental Report';

  // Escape HTML entities in dynamic content
  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const html = `<!DOCTYPE html><html><head><title>${escapeHtml(caseData.name)}</title><style>body{font-family:'Times New Roman',serif;max-width:8.5in;margin:1in auto;line-height:1.6;text-align:justify;}h2{text-decoration:underline;font-weight:normal;}p{margin:0.5em 0;}</style></head><body><h1>SWAINSTON CONSULTING GROUP</h1><h3>${escapeHtml(caseData.name)}</h3><h3>${escapeHtml(reportTypeLabel)}</h3><hr/>${report.content}<hr/><p><em>Sincerely,</em></p><p><strong>SWAINSTON CONSULTING GROUP</strong></p><p>Lane Swainston CBO, CXLT, TCDS — Principal Consultant</p><p>Mariz Arellano, CXLT — Senior Consultant</p></body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.html"`);
  res.send(html);
});

export default router;
