import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Check } from 'lucide-react';
import Header from '../components/layout/Header';
import StageNavV2 from '../components/shared/StageNavV2';
import AgentActivityFeedV2 from '../components/shared/AgentActivityFeedV2';
import HumanCheckpointV2 from '../components/shared/HumanCheckpointV2';
import ContextualActionButton from '../components/shared/ContextualActionButton';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import BearMark from '../components/shared/BearMark';
import DraftEditor from '../components/shared/DraftEditor';
import SectionReview from '../components/shared/SectionReview';
import RevisionPanel from '../components/shared/RevisionPanel';
import { useCaseStore } from '../stores/caseStore';
import { useAgentStore } from '../stores/agentStore';
import { api } from '../lib/api';

const DEFAULT_CONTENT = `<h2>Qualifications</h2>
<p>Lane Swainston is a Certified Building Official (CBO) with the International Code Council (ICC), a position he has held since 1987. He holds additional certifications as a Certified XL Tribometrist (CXLT) through Excel Tribometers, LLC, and as a Walkway Safety Auditor (ASTM F2948-13) through the University of North Texas.</p>
<p>Mariz Arellano is a Certified XL Tribometrist (CXLT) through Excel Tribometers, LLC, and holds a degree in Hotel Administration from the University of Nevada, Las Vegas.</p>
<h2>Documentation Reviewed</h2>
<p>The following documents were provided by your office or research reviewed by SCG in preparation for this Report.</p>
<h2>Points of Opinion</h2>
<p>The opinions expressed in this section are based on our review of the available records, photographs, videos, and witness statements, as well as our analysis of the subject incident area and relevant standards.</p>
<h2>Conclusion</h2>
<p>SCG holds these opinions with a reasonable degree of professional certainty. Should new details or information become available, we reserve the right to supplement our opinions as necessary.</p>`;

export default function CaseDrafting() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCase, fetchCase } = useCaseStore();
  const { logs, status, connectSSE, disconnectSSE, triggerAgent, clearLogs } = useAgentStore();
  const [content, setContent] = useState('');
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [saved, setSaved] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (id) { fetchCase(id); connectSSE(id); } return () => disconnectSSE(); }, [id, fetchCase, connectSSE, disconnectSSE]);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (activeCase?.report?.content) setContent(activeCase.report.content);
    else if (activeCase) setContent(DEFAULT_CONTENT);
  }, [activeCase]);
  useEffect(() => { if (status === 'complete') setShowCheckpoint(true); }, [status]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleRunDrafting = async () => { if (!id) return; clearLogs(); await triggerAgent(id, 'drafting'); };
  const handleSave = async () => {
    if (!id) return;
    await api.saveReport(id, content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const handleApprove = async () => {
    if (!id) return;
    await handleSave();
    const { nextStage } = await api.approve(id, 'drafting', 'approve');
    setShowCheckpoint(false);
    navigate(`/cases/${id}/${nextStage}`);
  };
  const handleRevise = async (notes: string) => {
    if (!id) return;
    await api.approve(id, 'drafting', 'revise', notes);
    clearLogs();
    await triggerAgent(id, 'drafting', notes);
  };

  const stageOrder = ['intake', 'research', 'drafting', 'qa', 'export'];
  const currentIdx = stageOrder.indexOf(activeCase?.stage || 'drafting');
  const completedStages = stageOrder.slice(0, currentIdx);

  const { error } = useCaseStore();
  if (error) return <div className="p-8 text-center"><p className="text-[var(--color-error)] text-sm mb-2">Failed to load case</p></div>;
  if (!activeCase) return <div className="p-6"><SkeletonLoader type="card" count={2} /></div>;
  const stageNavigate = (stage: string) => navigate(`/cases/${id}/${stage}`);

  return (
    <div className="page-enter">
      <Header title={activeCase.name} subtitle="Drafting — Voice rules, standard blocks, report structure" />
      <StageNavV2
        currentStage={(activeCase.stage || 'drafting') as 'intake' | 'research' | 'drafting' | 'qa' | 'export'}
        completedStages={completedStages}
        agentRunning={status === 'running'}
        onNavigate={stageNavigate}
      />

      <div className="grid grid-cols-12 gap-6 mt-6">
        {/* Section nav */}
        <div className="col-span-12 lg:col-span-2 space-y-3">
          <div className="glass rounded-2xl p-3">
            <h3 className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2 px-2">Sections</h3>
            <SectionReview html={content} scrollContainerRef={editorContainerRef} />
          </div>
          <div className="space-y-2">
            <ContextualActionButton stage="drafting" status={status} onAction={handleRunDrafting} />
            <button onClick={handleSave}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] rounded-xl text-xs hover:text-[var(--color-text-primary)] border border-[var(--color-border)]">
              {saved ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Save className="w-3 h-3" />} {saved ? 'Saved' : 'Save Draft'}
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="col-span-12 lg:col-span-7">
          <div className="glass rounded-2xl p-6 min-h-[600px] relative overflow-hidden">
            <BearMark variant="watermark" opacity={0.02} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 border-b border-[var(--color-border)] pb-3">
                <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Draft</span>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                  v{activeCase.report?.version || 1}
                </span>
              </div>
              <div ref={editorContainerRef} className="max-h-[640px] overflow-y-auto pr-2">
                <DraftEditor content={content} onChange={setContent} />
              </div>
            </div>
          </div>
        </div>

        {/* Activity + revision */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <AgentActivityFeedV2 logs={logs} stage="drafting" status={status} />
          <RevisionPanel onSubmit={handleRevise} disabled={status === 'running'} />
        </div>
      </div>

      {showCheckpoint && (
        <HumanCheckpointV2
          stage="drafting"
          summary="Draft complete — sections generated with entity voice maintained throughout."
          onApprove={handleApprove}
          onRevise={async (notes) => { await handleRevise(notes); setShowCheckpoint(false); }}
          onReject={() => setShowCheckpoint(false)}
        />
      )}
    </div>
  );
}
