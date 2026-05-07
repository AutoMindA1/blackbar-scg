import { useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import Header from '../components/layout/Header';
import StageNavV2 from '../components/shared/StageNavV2';
import AgentActivityFeedV2 from '../components/shared/AgentActivityFeedV2';
import HumanCheckpointV2 from '../components/shared/HumanCheckpointV2';
import ContextualActionButton from '../components/shared/ContextualActionButton';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import FindingsGrid from '../components/shared/FindingsGrid';
import ResearchSummary from '../components/shared/ResearchSummary';
import PatternCToast from '../components/shared/PatternCToast';
import type { Citation } from '../components/shared/CitationCard';
import { useCaseStore } from '../stores/caseStore';
import { useAgentStore } from '../stores/agentStore';
import { api, parseResearchFromMetadata } from '../lib/api';
import type { SSEMessage } from '../lib/api';

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

export default function CaseResearch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCase, fetchCase } = useCaseStore();
  const {
    logs,
    status,
    connectSSE,
    disconnectSSE,
    triggerAgent,
    clearLogs,
    autoAdvanceEvent,
    hitlEvent,
    clearAutoAdvanceEvent,
    clearHITLEvent,
    resetStatus,
  } = useAgentStore();
  const autoTriggered = useRef(false);

  useEffect(() => { if (id) { fetchCase(id); connectSSE(id); } return () => disconnectSSE(); }, [id, fetchCase, connectSSE, disconnectSSE]);

  // Discard stale 'complete' status carried over from the prior stage's run.
  // agentStore.status is global; without this, /research after Intake auto-
  // advance shows "Research Complete" instead of the "Run Research" button.
  useEffect(() => { resetStatus(); }, [resetStatus]);

  // Auto-fire Research when the user lands on /research and the case is in
  // the research stage with no findings yet. 1500ms grace lets SSE replay
  // any prior research run before we decide. Matches /ship-v1 PR 7 spec
  // ("auto-advance through Research/Drafting (Pattern C)").
  useEffect(() => {
    if (autoTriggered.current) return;
    if (!id) return;
    const timer = setTimeout(() => {
      if (autoTriggered.current) return;
      const ag = useAgentStore.getState();
      const ac = useCaseStore.getState().activeCase;
      if (!ac || ac.stage !== 'research') return;
      if (ag.status === 'running') return;
      if (ag.hitlEvent) return;
      if (ag.logs.some((l: SSEMessage) => l.type === 'finding')) return;
      autoTriggered.current = true;
      void ag.triggerAgent(id, 'research');
    }, 1500);
    return () => clearTimeout(timer);
  }, [id]);

  // Pattern C — auto-advance toast + programmatic navigate after 4s.
  useEffect(() => {
    if (!autoAdvanceEvent || !id) return;
    const target = autoAdvanceEvent.to;
    const timer = setTimeout(() => {
      clearAutoAdvanceEvent();
      navigate(`/cases/${id}/${target}`);
    }, 4000);
    return () => clearTimeout(timer);
  }, [autoAdvanceEvent, clearAutoAdvanceEvent, id, navigate]);

  const showCheckpoint = !!hitlEvent;
  const toastMessage = autoAdvanceEvent
    ? `${capitalize(autoAdvanceEvent.from)} complete · advancing to ${capitalize(autoAdvanceEvent.to)}`
    : null;

  const handleRunResearch = async () => { if (!id) return; clearLogs(); await triggerAgent(id, 'research'); };
  const handleApprove = async () => {
    if (!id) return;
    const { nextStage } = await api.approve(id, 'research', 'approve');
    clearHITLEvent();
    navigate(`/cases/${id}/${nextStage}`);
  };

  const stageOrder = ['intake', 'research', 'drafting', 'qa', 'export'];
  const currentIdx = stageOrder.indexOf(activeCase?.stage || 'research');
  const completedStages = stageOrder.slice(0, currentIdx);

  // Prefer the typed ResearchResult emitted by the Research agent's structured
  // JSON contract. Fall back to a heuristic prose-parser over `finding` events
  // for older runs / partial data.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- Compiler can't trace the prose-parser heuristic; manual memo is correct
  const citations: Citation[] = useMemo(() => {
    const evt = [...logs].reverse().find((l) => l.type === 'auto_advance' || l.type === 'hitl_required');
    const typed = parseResearchFromMetadata(evt?.metadata);
    if (typed && typed.findings.length > 0) {
      return typed.findings.map((f) => ({
        id: f.id,
        claim: f.opposingClaim,
        reference: f.codeReference,
        reasoning: f.reasoning,
        source: f.sourceDocument ? `${f.sourceDocument}${f.sourcePage ? ` p.${f.sourcePage}` : ''}` : undefined,
        attackPattern: f.attackPattern,
      }));
    }
    return logs
      .filter((l) => l.type === 'finding')
      .map((l, i) => {
        const message = l.message;
        const codeMatch = message.match(/((?:ANSI|ASTM|NFSI|IBC|UBC|ICC|IES)\s?[A-Z0-9.\-§]+(?:\s?§\s?[\d.]+)?)/);
        const atkMatch = message.match(/ATK-\d+/i);
        const sourceMatch = message.match(/(?:p(?:age)?\.?\s*\d+|Section\s*[\d.]+)/i);
        const sentences = message.split(/(?<=[.!?])\s+/);
        const claim = sentences.length > 1 ? sentences[0] : undefined;
        const reasoning = sentences.length > 1 ? sentences.slice(1).join(' ') : message;
        return {
          id: `f-${i}`,
          claim,
          reference: codeMatch?.[0],
          reasoning,
          source: sourceMatch?.[0],
          confidence: l.metadata?.confidence as number | undefined,
          attackPattern: (l.metadata?.attackPattern as string | undefined) || atkMatch?.[0]?.toUpperCase(),
        };
      });
  }, [logs]);

  // Findings shape used by HumanCheckpoint (kept for revise/approve flow)
  const findings = citations.map((c) => ({
    id: c.id,
    message: c.reasoning,
    confidence: c.confidence,
    attackPattern: c.attackPattern,
  }));

  const { error } = useCaseStore();
  if (error) return <div className="p-8 text-center"><p className="text-[var(--color-error)] text-sm mb-2">Failed to load case</p></div>;
  if (!activeCase) return <div className="p-6"><SkeletonLoader type="card" count={3} /></div>;

  const stageNavigate = (stage: string) => navigate(`/cases/${id}/${stage}`);

  return (
    <div className="page-enter">
      <Header title={activeCase.name} subtitle="Research — Attack patterns, codes, standards, adversary playbook" />
      <StageNavV2
        currentStage={(activeCase.stage || 'research') as 'intake' | 'research' | 'drafting' | 'qa' | 'export'}
        completedStages={completedStages}
        agentRunning={status === 'running'}
        onNavigate={stageNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left — Findings + action */}
        <div className="lg:col-span-2 space-y-4">
          {/* Action header */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-5 h-5" style={{ color: 'var(--color-accent-secondary)' }} />
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Research Findings</h3>
              {citations.length > 0 && (
                <span className="text-xs font-mono text-[var(--color-text-muted)]">{citations.length} findings</span>
              )}
            </div>
            <ContextualActionButton stage="research" status={status} onAction={handleRunResearch} />
          </div>

          <FindingsGrid citations={citations} />
        </div>

        {/* Right — Summary + Activity */}
        <div className="space-y-4">
          {citations.length > 0 && <ResearchSummary citations={citations} />}
          <AgentActivityFeedV2 logs={logs} stage="research" status={status} />
        </div>
      </div>

      {showCheckpoint && (
        <HumanCheckpointV2
          stage="research"
          summary={`Research complete — ${findings.length} attack patterns identified.`}
          findings={findings}
          triggers={hitlEvent?.triggers}
          onApprove={handleApprove}
          onRevise={async (notes) => { clearLogs(); clearHITLEvent(); await triggerAgent(id!, 'research', notes); }}
          onReject={clearHITLEvent}
        />
      )}

      <PatternCToast message={toastMessage} />
    </div>
  );
}
