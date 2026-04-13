import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import StageNavV2 from '../components/shared/StageNavV2';
import AgentActivityFeedV2 from '../components/shared/AgentActivityFeedV2';
import HumanCheckpointV2 from '../components/shared/HumanCheckpointV2';
import ContextualActionButton from '../components/shared/ContextualActionButton';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import QADashboard from '../components/shared/QADashboard';
import CheckResults from '../components/shared/CheckResults';
import IssuesList from '../components/shared/IssuesList';
import { useCaseStore } from '../stores/caseStore';
import { useAgentStore } from '../stores/agentStore';
import { api } from '../lib/api';
import type { QAScorecard } from '../lib/api';

export default function CaseQA() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCase, fetchCase } = useCaseStore();
  const { logs, status, connectSSE, disconnectSSE, triggerAgent, clearLogs } = useAgentStore();
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [scorecard, setScorecard] = useState<QAScorecard | null>(null);
  const [scorecardLoaded, setScorecardLoaded] = useState(false);

  useEffect(() => { if (id) { fetchCase(id); connectSSE(id); } return () => disconnectSSE(); }, [id, fetchCase, connectSSE, disconnectSSE]);

  // Fetch the latest persisted QA scorecard on mount
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.getQAScorecard(id)
      .then(({ qa }) => { if (!cancelled) { setScorecard(qa); setScorecardLoaded(true); } })
      .catch(() => { if (!cancelled) setScorecardLoaded(true); });
    return () => { cancelled = true; };
  }, [id]);

  // When the QA agent finishes, refetch the scorecard and surface the checkpoint.
  // Wrap state updates in the async callback (not top-level effect body) to satisfy
  // react-hooks/set-state-in-effect — the fetch is the external system sync.
  useEffect(() => {
    if (status !== 'complete' || !id) return;
    let cancelled = false;
    api.getQAScorecard(id)
      .then(({ qa }) => { if (!cancelled) { setScorecard(qa); setShowCheckpoint(true); } })
      .catch(() => { if (!cancelled) setShowCheckpoint(true); });
    return () => { cancelled = true; };
  }, [status, id]);

  // Live update: when a qa_result SSE event arrives, hydrate immediately.
  // Derived value — no setState needed; recalculates on every render when logs change.
  const liveQA = [...logs].reverse().find((l) => l.type === 'qa_result' && l.metadata?.qa);
  const liveScorecard = liveQA?.metadata?.qa as QAScorecard | undefined;
  const effectiveScorecard = liveScorecard ?? scorecard;

  const handleRunQA = async () => { if (!id) return; clearLogs(); setScorecard(null); await triggerAgent(id, 'qa'); };
  const handleApprove = async () => {
    if (!id) return;
    const { nextStage } = await api.approve(id, 'qa', 'approve');
    setShowCheckpoint(false);
    navigate(`/cases/${id}/${nextStage}`);
  };

  const stageOrder = ['intake', 'research', 'drafting', 'qa', 'export'];
  const currentIdx = stageOrder.indexOf(activeCase?.stage || 'qa');
  const completedStages = stageOrder.slice(0, currentIdx);

  const { error } = useCaseStore();
  if (error) return <div className="p-8 text-center"><p className="text-[var(--color-error)] text-sm mb-2">Failed to load case</p></div>;
  if (!activeCase) return <div className="p-6"><SkeletonLoader type="card" count={2} /></div>;

  const stageNavigate = (stage: string) => navigate(`/cases/${id}/${stage}`);

  // Real scorecard data — derived from agent output or live SSE, not mocked
  const score = effectiveScorecard?.score ?? 0;
  const checks = effectiveScorecard?.checks ?? [];
  const issues = effectiveScorecard?.issues ?? [];
  const passCount = checks.filter((c) => c.status === 'pass').length;
  const hasScorecard = effectiveScorecard !== null;

  return (
    <div className="page-enter">
      <Header title={activeCase.name} subtitle="QA — Prohibited terms, voice consistency, benchmark comparison" />
      <StageNavV2
        currentStage={(activeCase.stage || 'qa') as 'intake' | 'research' | 'drafting' | 'qa' | 'export'}
        completedStages={completedStages}
        agentRunning={status === 'running'}
        onNavigate={stageNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <QADashboard
            scorecard={effectiveScorecard}
            loaded={scorecardLoaded}
            running={status === 'running'}
            actionSlot={<ContextualActionButton stage="qa" status={status} onAction={handleRunQA} />}
          />
          {hasScorecard && checks.length > 0 && <CheckResults checks={checks} />}
          {hasScorecard && issues.length > 0 && <IssuesList issues={issues} />}
        </div>

        {/* Right — Activity */}
        <AgentActivityFeedV2 logs={logs} stage="qa" status={status} />
      </div>

      {showCheckpoint && (
        <HumanCheckpointV2
          stage="qa"
          summary={hasScorecard
            ? `QA complete — ${score}/100. ${passCount}/${checks.length} checks passed, ${issues.length} issue${issues.length === 1 ? '' : 's'}.`
            : 'QA agent finished but produced no parseable scorecard. Review the activity feed.'}
          qaScore={hasScorecard ? score : undefined}
          onApprove={handleApprove}
          onRevise={async (notes) => { clearLogs(); await triggerAgent(id!, 'qa', notes); setShowCheckpoint(false); }}
          onReject={() => setShowCheckpoint(false)}
        />
      )}
    </div>
  );
}
