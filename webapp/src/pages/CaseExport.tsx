import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, FileText, Check, AlertCircle } from 'lucide-react';
import Header from '../components/layout/Header';
import StageNav from '../components/shared/StageNav';
import { useCaseStore } from '../stores/caseStore';
import { api } from '../lib/api';

export default function CaseExport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCase, fetchCase } = useCaseStore();
  const [reportContent, setReportContent] = useState('');
  const [version, setVersion] = useState(1);

  useEffect(() => {
    if (id) {
      fetchCase(id);
      api.getReport(id).then((r) => { setReportContent(r.content); setVersion(r.version); }).catch(() => {});
    }
  }, [id]);

  const handleDownloadHTML = () => {
    if (!id || !activeCase) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeCase.name}</title><style>body{font-family:'Times New Roman',serif;max-width:8.5in;margin:1in auto;line-height:1.6;text-align:justify;color:#111;}h2{text-decoration:underline;font-weight:normal;margin-top:1.5em;}ul{padding-left:1.5em;}li{margin:0.3em 0;}p{margin:0.5em 0;}</style></head><body><div style="text-align:center;margin-bottom:2em;"><h1 style="margin:0;">SWAINSTON CONSULTING GROUP</h1><p style="font-size:14px;color:#666;margin-top:4px;">Savage Wins</p></div><h3>${activeCase.name}</h3><h4>${activeCase.reportType === 'initial' ? 'Initial Report' : activeCase.reportType === 'rebuttal' ? 'Rebuttal Report' : 'Supplemental Report'}</h4><hr/>${reportContent}<hr/><p style="margin-top:2em;"><em>Sincerely,</em></p><p><strong>SWAINSTON CONSULTING GROUP</strong></p><br/><table><tr><td style="padding-right:4em;"><p>Lane Swainston CBO, CXLT, TCDS</p><p>Principal Consultant</p></td><td><p>Mariz Arellano, CXLT</p><p>Senior Consultant</p></td></tr></table></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCase.name.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { error } = useCaseStore();
  if (error) return <div className="p-8 text-center"><p className="text-error text-sm mb-2">Failed to load case</p><p className="text-text-muted text-xs">{error}</p></div>;
  if (!activeCase) return <div className="p-8 text-center text-text-muted">Loading...</div>;
  const stageNavigate = (stage: string) => navigate(`/cases/${id}/${stage}`);

  return (
    <div>
      <Header title={activeCase.name} subtitle="Export — Final Report" />
      <StageNav currentStage={activeCase.stage} onNavigate={stageNavigate} />

      <div className="grid grid-cols-3 gap-6">
        {/* Report preview */}
        <div className="col-span-2">
          <div className="glass rounded-xl overflow-hidden">
            <div className="bg-surface px-5 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent-primary" />
                <span className="text-sm text-text-primary font-medium">Report Preview</span>
              </div>
              <span className="font-mono text-[10px] text-text-muted">Version {version}</span>
            </div>
            <div className="p-8 bg-white/[0.03] min-h-[600px]">
              {reportContent ? (
                <div
                  className="prose prose-invert prose-sm max-w-none text-text-secondary [&_h2]:underline [&_h2]:font-normal [&_h2]:text-text-primary [&_p]:text-justify"
                  dangerouslySetInnerHTML={{ __html: reportContent }}
                />
              ) : (
                <p className="text-text-muted text-center mt-20">No report content available yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Export sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="glass rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text-secondary">Report Metadata</h3>
            {[
              { label: 'Case', value: activeCase.name },
              { label: 'Report Type', value: activeCase.reportType || 'Initial' },
              { label: 'Version', value: `v${version}` },
              { label: 'Opposing Expert', value: activeCase.opposingExpert || '—' },
              { label: 'Jurisdiction', value: activeCase.jurisdiction || '—' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">{item.label}</p>
                <p className="text-xs text-text-primary mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          {/* QA status */}
          <div className="glass rounded-xl p-5">
            {activeCase.stage === 'export' || activeCase.stage === 'complete' ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-sm text-success font-medium">QA Approved</span>
                </div>
                <p className="text-xs text-text-secondary">Report has passed QA review.</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  <span className="text-sm text-warning font-medium">QA Pending</span>
                </div>
                <p className="text-xs text-text-secondary">Report has not yet passed QA review.</p>
              </>
            )}
          </div>

          {/* Download options */}
          <div className="glass rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text-secondary">Download Options</h3>
            <button onClick={handleDownloadHTML}
              className="w-full flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold py-3 rounded-lg transition-colors">
              <Download className="w-4 h-4" /> Download HTML
            </button>
            <button disabled
              className="w-full flex items-center justify-center gap-2 bg-surface border border-border text-text-muted py-3 rounded-lg text-sm cursor-not-allowed opacity-50"
              title="PDF export coming soon">
              <Download className="w-4 h-4" /> Download PDF (Coming Soon)
            </button>
            <button disabled
              className="w-full flex items-center justify-center gap-2 bg-surface border border-border text-text-muted py-3 rounded-lg text-sm cursor-not-allowed opacity-50"
              title="DOCX export coming soon">
              <Download className="w-4 h-4" /> Download DOCX (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
