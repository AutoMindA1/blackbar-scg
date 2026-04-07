import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import StageNavV2 from '../components/shared/StageNavV2';
import AgentActivityFeedV2 from '../components/shared/AgentActivityFeedV2';
import HumanCheckpointV2 from '../components/shared/HumanCheckpointV2';
import ContextualActionButton from '../components/shared/ContextualActionButton';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import FileDropzone from '../components/shared/FileDropzone';
import CaseForm from '../components/shared/CaseForm';
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

  useEffect(() => { if (id) { fetchCase(id); connectSSE(id); } return () => disconnectSSE(); }, [id, fetchCase, connectSSE, disconnectSSE]);
  useEffect(() => { if (status === 'complete') setShowCheckpoint(true); }, [status]);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!id) return;
    setUploading(true);
    try {
      await api.uploadDocuments(id, files);
      await fetchCase(id);
    } finally { setUploading(false); }
  }, [id, fetchCase]);

  const handleSaveDetails = useCallback(async (values: Record<string, unknown>) => {
    if (!id) return;
    await api.updateCase(id, values);
    await fetchCase(id);
  }, [id, fetchCase]);

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

  // Derive completed stages from current stage
  const stageOrder = ['intake', 'research', 'drafting', 'qa', 'export'];
  const currentIdx = stageOrder.indexOf(activeCase?.stage || 'intake');
  const completedStages = stageOrder.slice(0, currentIdx);

  // Build findings for checkpoint from logs
  const findings = logs
    .filter(l => l.type === 'finding')
    .map((l, i) => ({
      id: `f-${i}`,
      message: l.message,
      confidence: l.metadata?.confidence as number | undefined,
      attackPattern: l.metadata?.attackPattern as string | undefined,
    }));

  const { error } = useCaseStore();
  if (error) return (
    <div className="p-8 text-center">
      <p className="text-[var(--color-error)] text-sm mb-2">Failed to load case</p>
      <p className="text-[var(--color-text-muted)] text-xs">{error}</p>
    </div>
  );

  if (!activeCase) return <div className="p-6"><SkeletonLoader type="card" count={3} /></div>;

  return (
    <div className="page-enter">
      <Header
        title={activeCase.name}
        subtitle={`${activeCase.reportType || 'Initial'} Report \u2014 ${activeCase.jurisdiction || 'Clark County'}`}
      />
      <StageNavV2
        currentStage={(activeCase.stage || 'intake') as 'intake' | 'research' | 'drafting' | 'qa' | 'export'}
        completedStages={completedStages}
        agentRunning={status === 'running'}
        onNavigate={stageNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left — Upload + Action (Steps 1 & 2) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Step 1: Upload */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-4">Step 1: Upload Documents</h3>
            <FileDropzone
              documents={activeCase.documents}
              uploading={uploading}
              onFiles={handleFiles}
              hint="Expert reports, depositions, photos · PDF page counts auto-extracted"
            />
          </div>

          {/* Step 2: Run Analysis */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-4">Step 2: Run Analysis</h3>
            <ContextualActionButton
              stage="intake"
              status={status}
              onAction={handleStartAnalysis}
              disabled={activeCase.documents.length === 0}
            />
          </div>
        </div>

        {/* Right — Details + Activity */}
        <div className="space-y-4">
          <CaseForm
            initial={{
              caseType: activeCase.caseType,
              reportType: activeCase.reportType,
              jurisdiction: activeCase.jurisdiction,
              opposingExpert: activeCase.opposingExpert,
              deadline: activeCase.deadline,
            }}
            onSave={handleSaveDetails}
          />

          {/* Agent Activity */}
          <AgentActivityFeedV2 logs={logs} stage="intake" status={status} />
        </div>
      </div>

      {/* Human Checkpoint */}
      {showCheckpoint && (
        <HumanCheckpointV2
          stage="intake"
          summary="Intake analysis complete — case classified, jurisdiction confirmed, opposing expert flagged."
          findings={findings}
          onApprove={handleApprove}
          onRevise={handleRevise}
          onReject={() => setShowCheckpoint(false)}
        />
      )}
    </div>
  );
}
