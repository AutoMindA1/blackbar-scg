import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PenTool } from 'lucide-react';
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
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import type { QAScorecard } from '../lib/api';

export default function CaseQA() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCase, fetchCase } = useCaseStore();
  const {
    logs, status, connectSSE, disconnectSSE, triggerAgent, clearLogs,
    resetStatus, hitlEvent, clearHITLEvent,
  } = useAgentStore();
  const [scorecard, setScorecard] = useState<QAScorecard | null>(null);
  const [scorecardLoaded, setScorecardLoaded] = useState(false);

  useEffect(() => { if (id) { fetchCase(id); connectSSE(id); } return () => disconnectSSE(); }, [id, fetchCase, connectSSE, disconnectSSE]);

  // Discard stale 'complete' carried over from the prior stage.
  useEffect(() => { resetStatus(); }, [resetStatus]);

  // Fetch the latest persisted QA scorecard on mount (replay path).
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.getQAScorecard(id)
      .then(({ qa }) => { if (!cancelled) { setScorecard(qa); setScorecardLoaded(true); } })
      .catch(() => { if (!cancelled) setScorecardLoaded(true); });
    return () => { cancelled = true; };
  }, [id]);

  // When QA fires hitl_required, refetch the persisted scorecard so the
  // checkpoint summary has the latest data.
  useEffect(() => {
    if (!hitlEvent || !id) return;
    let cancelled = false;
    api.getQAScorecard(id)
      .then(({ qa }) => { if (!cancelled) { setScorecard(qa); setScorecardLoaded(true); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [hitlEvent, id]);

  const showCheckpoint = !!hitlEvent;

  // Live update: when a qa_result SSE event arrives, hydrate immediately.
  // Derived value — no setState needed; recalculates on every render when logs change.
  const liveQA = [...logs].reverse().find((l) => l.type === 'qa_result' && l.metadata?.qa);
  const liveScorecard = liveQA?.metadata?.qa as QAScorecard | undefined;
  const effectiveScorecard = liveScorecard ?? scorecard;

  const handleRunQA = async () => { if (!id) return; clearLogs(); setScorecard(null); await triggerAgent(id, 'qa'); };
  const handleApprove = async () => {
    if (!id) return;
    const { nextStage } = await api.approve(id, 'qa', 'approve');
    clearHITLEvent();
    navigate(`/cases/${id}/${nextStage}`);
  };

  // Lane (expert) signs at QA passing — attaches his credentials via the
  // existing approve endpoint (auth middleware records actor) and routes to
  // export. Mariz still has the Approve button inside the modal; only Lane
  // gets this top-level CTA per MARIZ-SURFACE-SPEC.md §What Lane sees.
  const userRole = useAuthStore((s) => s.user?.role);
  const handleSignAndShip = async () => {
    if (!id) return;
    const { nextStage } = await api.approve(id, 'qa', 'approve');
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
  const canSignAndShip = userRole === 'expert' && hasScorecard && score >= 70;

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
          {canSignAndShip && (
            <div
              className="v2-surface rounded-2xl p-6 text-center"
              style={{ border: '1px solid var(--signal-amber-border)' }}
            >
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Ready to ship</p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                QA passed at {score}/100. Signing attaches your credentials and routes the report to export.
              </p>
              <button
                onClick={handleSignAndShip}
                className="v2-btn v2-btn-primary inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-xl"
              >
                <PenTool size={16} />
                Sign &amp; ship
              </button>
            </div>
          )}
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
          onRevise={async (notes) => { clearLogs(); clearHITLEvent(); await triggerAgent(id!, 'qa', notes); }}
          onReject={clearHITLEvent}
        />
      )}
    </div>
  );
}
