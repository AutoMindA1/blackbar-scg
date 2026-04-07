import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

// Lazy puppeteer + html-to-docx — heavy deps, only loaded on first export request
async function renderPdf(html: string): Promise<Buffer> {
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'Letter',
      margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:9px;color:#666;width:100%;text-align:center;font-family:'Times New Roman',serif;">SWAINSTON CONSULTING GROUP</div>`,
      footerTemplate: `<div style="font-size:9px;color:#666;width:100%;text-align:center;font-family:'Times New Roman',serif;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function renderDocx(html: string): Promise<Buffer> {
  // html-to-docx is CJS — dynamic import
  const mod = await import('html-to-docx');
  type HtmlToDocxFn = (html: string, header?: string | null, options?: Record<string, unknown>) => Promise<Buffer | ArrayBuffer>;
  const htmlToDocx = (mod as { default?: HtmlToDocxFn }).default ?? (mod as unknown as HtmlToDocxFn);
  const result = await htmlToDocx(html, null, {
    margins: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
    font: 'Times New Roman',
    fontSize: 24, // half-points → 12pt
    pageSize: { width: 12240, height: 15840 }, // Letter
    pageNumber: true,
  });
  return result instanceof Buffer ? result : Buffer.from(result as ArrayBuffer);
}

// Server-side HTML sanitization — strip dangerous tags and event handlers
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<link[\s\S]*?>/gi, '')
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:');
}

const router = Router();
router.use(authMiddleware);

const caseIdParam = z.string().min(1).max(100);
const updateReportSchema = z.object({
  content: z.string().max(500000),
});
const exportSchema = z.object({
  format: z.enum(['pdf', 'docx']),
});

// GET /api/cases/:id/report
router.get('/:id/report', async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const report = await prisma.report.findUnique({ where: { caseId: req.params.id } });
  if (!report) { res.status(404).json({ error: 'No report found' }); return; }
  res.json({ content: report.content, sections: report.sections, version: report.version });
});

// PUT /api/cases/:id/report
router.put('/:id/report', async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const parsed = updateReportSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  const content = sanitizeHtml(parsed.data.content);
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

function buildExportHtml(caseName: string, reportTypeLabel: string, body: string): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(caseName)}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; text-align: justify; color: #111; }
  h1 { font-size: 18pt; text-align: center; margin: 0 0 4px 0; }
  h2 { font-size: 14pt; text-decoration: underline; font-weight: normal; margin-top: 1.2em; margin-bottom: 0.6em; }
  h3 { font-size: 13pt; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
  h4 { font-size: 12pt; font-weight: bold; }
  p { margin: 0.5em 0; }
  ul, ol { padding-left: 1.5em; }
  li { margin: 0.3em 0; }
  hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
  .header-block { text-align: center; margin-bottom: 2em; }
  .tagline { font-size: 11pt; color: #666; font-style: italic; margin: 0; }
  .case-line { font-size: 13pt; font-weight: bold; margin-top: 1em; }
  .signoff { margin-top: 2em; }
  .signoff p { margin: 0.3em 0; }
  .signoff-table { margin-top: 1em; width: 100%; }
  .signoff-table td { vertical-align: top; padding-right: 2em; }
</style>
</head>
<body>
  <div class="header-block">
    <h1>SWAINSTON CONSULTING GROUP</h1>
    <p class="tagline">Savage Wins</p>
  </div>
  <p class="case-line">${escapeHtml(caseName)}</p>
  <p class="case-line">${escapeHtml(reportTypeLabel)}</p>
  <hr/>
  ${body}
  <hr/>
  <div class="signoff">
    <p><em>Sincerely,</em></p>
    <p><strong>SWAINSTON CONSULTING GROUP</strong></p>
    <table class="signoff-table">
      <tr>
        <td>
          <p>Lane Swainston CBO, CXLT, TCDS</p>
          <p>Principal Consultant</p>
        </td>
        <td>
          <p>Mariz Arellano, CXLT</p>
          <p>Senior Consultant</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

// POST /api/cases/:id/export
router.post('/:id/export', async (req: AuthRequest, res: Response) => {
  if (!caseIdParam.safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid case ID' }); return; }
  const parsed = exportSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Format must be pdf or docx' }); return; }
  const report = await prisma.report.findUnique({ where: { caseId: req.params.id } });
  const caseData = await prisma.case.findUnique({ where: { id: req.params.id } });
  if (!report || !caseData) { res.status(404).json({ error: 'No report found' }); return; }

  const safeName = caseData.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const reportTypeLabel =
    caseData.reportType === 'initial' ? 'Initial Report'
    : caseData.reportType === 'rebuttal' ? 'Rebuttal Report'
    : caseData.reportType === 'supplemental' ? 'Supplemental Report'
    : 'Report';

  const sanitizedBody = sanitizeHtml(report.content || '');
  const html = buildExportHtml(caseData.name, reportTypeLabel, sanitizedBody);

  try {
    if (parsed.data.format === 'pdf') {
      const pdf = await renderPdf(html);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
      res.setHeader('Content-Length', pdf.length.toString());
      res.end(pdf);
      return;
    }
    if (parsed.data.format === 'docx') {
      const docx = await renderDocx(html);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.docx"`);
      res.setHeader('Content-Length', docx.length.toString());
      res.end(docx);
      return;
    }
  } catch (err) {
    console.error('[reports] Export render failed:', err);
    res.status(500).json({ error: 'Export render failed', detail: err instanceof Error ? err.message : 'unknown' });
    return;
  }

  res.status(400).json({ error: 'Unsupported format' });
});

export default router;
