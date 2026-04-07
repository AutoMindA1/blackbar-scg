import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';

const PURIFY_CONFIG = { ALLOWED_TAGS: ['h1','h2','h3','h4','p','ul','ol','li','em','strong','br','hr','table','tr','td','th','thead','tbody','span','sub','sup'], ALLOWED_ATTR: ['style','class'] };
import Header from '../components/layout/Header';
import StageNavV2 from '../components/shared/StageNavV2';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import BearMark from '../components/shared/BearMark';
import { useCaseStore } from '../stores/caseStore';
import { api } from '../lib/api';

export default function CaseExport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCase, fetchCase } = useCaseStore();
  const [reportContent, setReportContent] = useState('');
  const [version, setVersion] = useState(1);
  const [downloadFlash, setDownloadFlash] = useState(false);
  const [exporting, setExporting] = useState<null | 'pdf' | 'docx'>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const sanitizedContent = useMemo(() => DOMPurify.sanitize(reportContent, PURIFY_CONFIG), [reportContent]);

  useEffect(() => {
    if (id) {
      fetchCase(id);
      api.getReport(id).then((r) => { setReportContent(r.content); setVersion(r.version); }).catch(() => {});
    }
  }, [id, fetchCase]);

  const handleDownloadBinary = async (format: 'pdf' | 'docx') => {
    if (!id || !activeCase) return;
    setExporting(format);
    setExportError(null);
    try {
      const blob = await api.exportReport(id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeCase.name.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadFlash(true);
      setTimeout(() => setDownloadFlash(false), 1000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : `${format.toUpperCase()} export failed`);
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadHTML = () => {
    if (!id || !activeCase) return;
    const escName = activeCase.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const reportTypeLabel = activeCase.reportType === 'initial' ? 'Initial Report' : activeCase.reportType === 'rebuttal' ? 'Rebuttal Report' : 'Supplemental Report';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escName}</title><style>body{font-family:'Times New Roman',serif;max-width:8.5in;margin:1in auto;line-height:1.6;text-align:justify;color:#111;}h2{text-decoration:underline;font-weight:normal;margin-top:1.5em;}ul{padding-left:1.5em;}li{margin:0.3em 0;}p{margin:0.5em 0;}</style></head><body><div style="text-align:center;margin-bottom:2em;"><h1 style="margin:0;">SWAINSTON CONSULTING GROUP</h1><p style="font-size:14px;color:#666;margin-top:4px;">Savage Wins</p></div><h3>${escName}</h3><h4>${reportTypeLabel}</h4><hr/>${sanitizedContent}<hr/><p style="margin-top:2em;"><em>Sincerely,</em></p><p><strong>SWAINSTON CONSULTING GROUP</strong></p><br/><table><tr><td style="padding-right:4em;"><p>Lane Swainston CBO, CXLT, TCDS</p><p>Principal Consultant</p></td><td><p>Mariz Arellano, CXLT</p><p>Senior Consultant</p></td></tr></table></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCase.name.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);

    // Bear eyes flash
    setDownloadFlash(true);
    setTimeout(() => setDownloadFlash(false), 1000);
  };

  const stageOrder = ['intake', 'research', 'drafting', 'qa', 'export'];
  const currentIdx = stageOrder.indexOf(activeCase?.stage || 'export');
  const completedStages = stageOrder.slice(0, currentIdx);

  const { error } = useCaseStore();
  if (error) return <div className="p-8 text-center"><p className="text-[var(--color-error)] text-sm mb-2">Failed to load case</p></div>;
  if (!activeCase) return <div className="p-6"><SkeletonLoader type="card" count={2} /></div>;
  const stageNavigate = (stage: string) => navigate(`/cases/${id}/${stage}`);

  return (
    <div className="page-enter">
      <Header title={activeCase.name} subtitle="Export — Final Report" />
      <StageNavV2
        currentStage={(activeCase.stage || 'export') as 'intake' | 'research' | 'drafting' | 'qa' | 'export'}
        completedStages={completedStages}
        onNavigate={stageNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Report preview */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl overflow-hidden relative">
            {downloadFlash ? <BearMark variant="glow" /> : <BearMark variant="watermark" opacity={0.04} />}
            <div className="relative z-10">
              <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--color-accent-primary)]" />
                  <span className="text-sm text-[var(--color-text-primary)] font-medium">Report Preview</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--color-text-muted)]">Version {version}</span>
              </div>
              <div className="p-8 min-h-[600px]">
                {reportContent ? (
                  <div
                    className="report-text text-[var(--color-text-secondary)] [&_h2]:underline [&_h2]:font-normal [&_h2]:text-[var(--color-text-primary)] [&_h2]:mb-4 [&_p]:mb-3"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                  />
                ) : (
                  <p className="text-[var(--color-text-muted)] text-center mt-20">No report content available yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Export sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="glass rounded-2xl p-5 space-y-3 brass-border">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Report Metadata</h3>
            {[
              { label: 'Case', value: activeCase.name },
              { label: 'Report Type', value: activeCase.reportType || 'Initial' },
              { label: 'Version', value: `v${version}` },
              { label: 'Opposing Expert', value: activeCase.opposingExpert || '\u2014' },
              { label: 'Jurisdiction', value: activeCase.jurisdiction || '\u2014' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{item.label}</p>
                <p className="text-xs text-[var(--color-text-primary)] mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          {/* QA status */}
          <div className="glass rounded-2xl p-5">
            {activeCase.stage === 'export' || activeCase.stage === 'complete' ? (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[var(--color-success)]" />
                <span className="text-sm text-[var(--color-success)] font-medium">QA Approved</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--color-warning)]" />
                <span className="text-sm text-[var(--color-warning)] font-medium">QA Pending</span>
              </div>
            )}
          </div>

          {/* Download options */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Download</h3>
            <button
              onClick={() => handleDownloadBinary('pdf')}
              disabled={exporting !== null || !reportContent}
              className="w-full flex items-center justify-center gap-2 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {exporting === 'pdf'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />
              }
              {exporting === 'pdf' ? 'Rendering PDF…' : 'Download PDF'}
            </button>
            <button
              onClick={() => handleDownloadBinary('docx')}
              disabled={exporting !== null || !reportContent}
              className="w-full flex items-center justify-center gap-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)] py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'docx'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />
              }
              {exporting === 'docx' ? 'Rendering DOCX…' : 'Download DOCX'}
            </button>
            <button
              onClick={handleDownloadHTML}
              disabled={!reportContent}
              className="w-full flex items-center justify-center gap-2 bg-transparent border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-2 rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3 h-3" /> Download HTML
            </button>
            {exportError && (
              <p className="text-[10px] text-[var(--color-error)] text-center">{exportError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
