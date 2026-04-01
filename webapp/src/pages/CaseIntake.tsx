import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, FileText, Play, Loader2 } from 'lucide-react';
import Header from '../components/layout/Header';
import StageNav from '../components/shared/StageNav';
import AgentActivityFeed from '../components/shared/AgentActivityFeed';
import HumanCheckpoint from '../components/shared/HumanCheckpoint';
import { useCaseStore } from '../stores/caseStore';
import { useAgentStore } from '../stores/agentStore';
import { api } from '../lib/api';

export default function CaseIntake() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCase, fetchCase } = useCaseStore();
  const { logs, status, connectSSE, disconnectSSE, triggerAgent, clearLogs } = useAgentStore();
  const [uploading, setUploading] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { if (id) { fetchCase(id); connectSSE(id); } return () => disconnectSSE(); }, [id, fetchCase, connectSSE, disconnectSSE]);
  useEffect(() => { if (status === 'complete') setShowCheckpoint(true); }, [status]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!id) return;
    setUploading(true);
    try {
      await api.uploadDocuments(id, Array.from(files));
      await fetchCase(id);
    } finally { setUploading(false); }
  }, [id, fetchCase]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const handleStartAnalysis = async () => {
    if (!id) return;
    clearLogs();
    await triggerAgent(id, 'intake');
  };

  const handleApprove = async () => {
    if (!id) return;
    const { nextStage } = await api.approve(id, 'intake', 'approve');
    setShowCheckpoint(false);
    navigate(`/cases/${id}/${nextStage}`);
  };

  const handleRevise = async (notes: string) => {
    if (!id) return;
    await api.approve(id, 'intake', 'revise', notes);
    clearLogs();
    await triggerAgent(id, 'intake', notes);
    setShowCheckpoint(false);
  };

  const stageNavigate = (stage: string) => navigate(`/cases/${id}/${stage}`);

  const { error } = useCaseStore();
  if (error) return <div className="p-8 text-center"><p className="text-error text-sm mb-2">Failed to load case</p><p className="text-text-muted text-xs">{error}</p></div>;
  if (!activeCase) return <div className="p-8 text-center text-text-muted">Loading case...</div>;

  return (
    <div>
      <Header title={activeCase.name} subtitle={`${activeCase.reportType || 'Initial'} Report — ${activeCase.jurisdiction || 'Clark County'}`} />
      <StageNav currentStage={activeCase.stage} onNavigate={stageNavigate} agentRunning={status === 'running'} />

      <div className="grid grid-cols-3 gap-6">
        {/* Left — Case Metadata */}
        <div className="glass rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-secondary">Case Details</h3>
          {[
            { label: 'Case Type (Brain §3)', value: activeCase.caseType?.replace('_', ' & ') || '—' },
            { label: 'Report Type (Brain §4)', value: activeCase.reportType || '—' },
            { label: 'Jurisdiction', value: activeCase.jurisdiction || '—' },
            { label: 'Opposing Expert', value: activeCase.opposingExpert || '—' },
            { label: 'Deadline', value: activeCase.deadline ? new Date(activeCase.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">{item.label}</p>
              <p className="text-sm text-text-primary mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Center — Upload Zone */}
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`glass rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-accent-primary bg-accent-glow' : ''}`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input id="file-input" type="file" multiple accept=".pdf,.docx,.doc" className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }} />
            <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-accent-primary' : 'text-text-muted'}`} />
            <p className="text-sm text-text-secondary">Drop PDF/DOCX files here or click to browse</p>
            {uploading && <Loader2 className="w-5 h-5 mx-auto mt-3 text-accent-primary animate-spin" />}
          </div>

          {/* File list */}
          {activeCase.documents.length > 0 && (
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-semibold text-text-secondary mb-3">Uploaded Documents</h3>
              <div className="space-y-2">
                {activeCase.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-2 px-3 bg-surface rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-accent-secondary" />
                      <span className="text-xs text-text-primary">{doc.filename}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-text-muted font-mono">
                      <span>{doc.pageCount || '?'} pages</span>
                      <span>{doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(0)}KB` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleStartAnalysis}
            disabled={activeCase.documents.length === 0 || status === 'running'}
            className="w-full flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors">
            {status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Start Analysis
          </button>
        </div>

        {/* Right — Activity Feed */}
        <AgentActivityFeed logs={logs} />
      </div>

      {showCheckpoint && (
        <HumanCheckpoint
          stage="intake"
          summary="Intake analysis complete — case classified, jurisdiction confirmed, opposing expert flagged."
          onApprove={handleApprove}
          onRevise={handleRevise}
          onReject={() => setShowCheckpoint(false)}
          onClose={() => setShowCheckpoint(false)}
        />
      )}
    </div>
  );
}
