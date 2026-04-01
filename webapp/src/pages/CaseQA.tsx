import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, CheckCircle, Info, RotateCcw } from 'lucide-react';
import Header from '../components/layout/Header';
import StageNav from '../components/shared/StageNav';
import AgentActivityFeed from '../components/shared/AgentActivityFeed';
import HumanCheckpoint from '../components/shared/HumanCheckpoint';
import { useCaseStore } from '../stores/caseStore';
import { useAgentStore } from '../stores/agentStore';
import { api } from '../lib/api';

const MOCK_CHECKS = [
  { category: 'Citation Accuracy', status: 'pass', detail: 'All 12 citations verified against source documents' },
  { category: 'Voice Consistency (Brain §5)', status: 'pass', detail: 'Entity voice maintained — no unauthorized "I" in body text. SCG speaks throughout.' },
  { category: 'Prohibited Terms (Brain §5)', status: 'warning', detail: '"prior to" found in §4 paragraph 2 — replace with "before" per Lane directive (28 Mar 2026)' },
  { category: 'Date Format (Brain §5)', status: 'pass', detail: 'All dates in European format: day month year, no commas, no ordinals' },
  { category: 'Format Rules (Brain §12)', status: 'pass', detail: 'Headers underlined, figure captions bold+centered, footnote citations at page bottom' },
  { category: 'Benchmark Test (Brain §11)', status: 'pass', detail: 'Closest match: Gleason (Initial Report, 2 Feb 2026) — 94% similarity' },
  { category: 'Logical Coherence', status: 'pass', detail: 'Arguments flow from evidence to opinion without gaps. Attack patterns properly sequenced.' },
  { category: 'Required Terms', status: 'pass', detail: '"allegedly slipped and fell", "subject incident area", "contributing factor(s)", "trier of fact" — all present' },
];

const MOCK_ISSUES = [
  { severity: 'warning', description: '"prior to" found in Date & Location section paragraph 2', location: 'Section 3, Paragraph 2', fix: 'Replace with "before" per Brain §5 prohibited terms' },
  { severity: 'info', description: 'Consider adding BLK-07 (Distracted walking / NSC) — footwear/gait analysis references pedestrian attention', location: 'Points of Opinion', fix: 'Optional: insert BLK-07 after gait analysis paragraph' },
];

export default function CaseQA() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCase, fetchCase } = useCaseStore();
  const { logs, status, connectSSE, disconnectSSE, triggerAgent, clearLogs } = useAgentStore();
  const [showCheckpoint, setShowCheckpoint] = useState(false);

  useEffect(() => { if (id) { fetchCase(id); connectSSE(id); } return () => disconnectSSE(); }, [id, fetchCase, connectSSE, disconnectSSE]);
  useEffect(() => { if (status === 'complete') setShowCheckpoint(true); }, [status]);

  const handleRunQA = async () => { if (!id) return; clearLogs(); await triggerAgent(id, 'qa'); };

  const handleApprove = async () => {
    if (!id) return;
    const { nextStage } = await api.approve(id, 'qa', 'approve');
    setShowCheckpoint(false);
    navigate(`/cases/${id}/${nextStage}`);
  };

  const { error } = useCaseStore();
  if (error) return <div className="p-8 text-center"><p className="text-error text-sm mb-2">Failed to load case</p><p className="text-text-muted text-xs">{error}</p></div>;
  if (!activeCase) return <div className="p-8 text-center text-text-muted">Loading...</div>;
  const stageNavigate = (stage: string) => navigate(`/cases/${id}/${stage}`);
  const passCount = MOCK_CHECKS.filter((c) => c.status === 'pass').length;
  const score = Math.round((passCount / MOCK_CHECKS.length) * 100);

  return (
    <div>
      <Header title={activeCase.name} subtitle="QA — Brain queries: §11 Benchmark Cases, §5 Prohibited Terms, §5 Identity/Date, §12 Format Rules" />
      <StageNav currentStage={activeCase.stage} onNavigate={stageNavigate} agentRunning={status === 'running'} />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Score hero */}
          <div className="glass rounded-xl p-8 text-center glow-border">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Quality Score</p>
            <p className="font-display text-6xl text-text-primary">{score}<span className="text-2xl text-text-muted">/100</span></p>
            <p className="text-sm text-text-secondary mt-2">
              {passCount}/{MOCK_CHECKS.length} checks passed — {score >= 90 ? 'Courtroom ready' : 'Needs revision'}
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={handleRunQA}
                disabled={status === 'running'}
                className="px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg text-sm hover:bg-accent-primary/30 disabled:opacity-50">
                {status === 'running' ? 'Running...' : 'Run QA Agent'}
              </button>
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/20 text-warning">Sample Data</span>
            </div>
          </div>

          {/* Check categories */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text-secondary mb-4">Check Results</h3>
            <div className="space-y-2">
              {MOCK_CHECKS.map((check) => (
                <div key={check.category} className="flex items-start gap-3 py-2.5 px-3 bg-surface rounded-lg">
                  {check.status === 'pass' ? <CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" /> :
                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />}
                  <div className="flex-1">
                    <p className="text-xs text-text-primary font-medium">{check.category}</p>
                    <p className="text-[11px] text-text-secondary mt-0.5">{check.detail}</p>
                  </div>
                  <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-full ${check.status === 'pass' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Issues */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text-secondary mb-4">Issues</h3>
            <div className="space-y-2">
              {MOCK_ISSUES.map((issue, i) => (
                <div key={i} className="py-3 px-3 bg-surface rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    {issue.severity === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-warning" /> : <Info className="w-3.5 h-3.5 text-accent-secondary" />}
                    <span className={`font-mono text-[10px] uppercase ${issue.severity === 'warning' ? 'text-warning' : 'text-accent-secondary'}`}>
                      {issue.severity}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono ml-auto">{issue.location}</span>
                  </div>
                  <p className="text-xs text-text-primary">{issue.description}</p>
                  <p className="text-[11px] text-text-muted mt-1">Fix: {issue.fix}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowCheckpoint(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-success/20 text-success py-3 rounded-lg hover:bg-success/30 transition-colors font-medium">
              <ShieldCheck className="w-4 h-4" /> Approve for Export
            </button>
            <button onClick={() => navigate(`/cases/${id}/drafting`)}
              className="flex items-center gap-2 px-6 py-3 bg-surface text-text-secondary rounded-lg hover:text-text-primary text-sm">
              <RotateCcw className="w-4 h-4" /> Send Back to Drafting
            </button>
          </div>
        </div>

        <AgentActivityFeed logs={logs} />
      </div>

      {showCheckpoint && (
        <HumanCheckpoint
          stage="qa"
          summary={`QA complete — ${score}/100. ${passCount}/${MOCK_CHECKS.length} checks passed. 1 warning (prohibited term "prior to"). Benchmark: closest match is Gleason at 94% similarity.`}
          onApprove={handleApprove}
          onRevise={async (notes) => { clearLogs(); await triggerAgent(id!, 'qa', notes); setShowCheckpoint(false); }}
          onReject={() => setShowCheckpoint(false)}
          onClose={() => setShowCheckpoint(false)}
        />
      )}
    </div>
  );
}
