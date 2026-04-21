import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Image, X, Eye } from 'lucide-react';
import Header from '../components/layout/Header';
import StageNavV2 from '../components/shared/StageNavV2';
import AgentActivityFeedV2 from '../components/shared/AgentActivityFeedV2';
import HumanCheckpointV2 from '../components/shared/HumanCheckpointV2';
import ContextualActionButton from '../components/shared/ContextualActionButton';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import FileDropzone from '../components/shared/FileDropzone';
import ImagePreviewModal from '../components/shared/ImagePreviewModal';
import NoteList from '../components/shared/NoteList';
import CaseForm from '../components/shared/CaseForm';
import { useCaseStore } from '../stores/caseStore';
import { useAgentStore } from '../stores/agentStore';
import { api, parseIntakeFromMetadata } from '../lib/api';
import type { Doc } from '../lib/api';

const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|bmp|tiff?)$/i;
function isImageDoc(doc: Doc): boolean { return IMAGE_EXTS.test(doc.filename); }

function DocRow({ doc, onRemove }: { doc: Doc; onRemove?: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-[var(--noir-2)] group">
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText size={14} className="shrink-0" style={{ color: 'var(--signal-amber)' }} />
        <div className="min-w-0">
          <span className="text-xs text-[var(--color-text-primary)] font-medium truncate block">{doc.filename}</span>
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
            {doc.pageCount ?? '?'} pages · {doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(0)}KB` : ''}
          </span>
        </div>
      </div>
      {onRemove && (
        <button
          onClick={() => onRemove(doc.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] rounded"
          aria-label={`Remove ${doc.filename}`}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function PhotoGrid({ photos, onPreview, onRemove }: {
  photos: Doc[];
  onPreview: (index: number) => void;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {photos.map((photo, i) => (
        <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square bg-[var(--noir-2)]">
          <img
            src={`/uploads/${photo.filepath.split('/').pop()}`}
            alt={photo.filename}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
            <button
              onClick={() => onPreview(i)}
              className="p-1.5 rounded-full bg-[var(--noir-2)] text-[var(--color-text-primary)] hover:bg-[var(--noir-3)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-amber)]"
              aria-label={`Preview ${photo.filename}`}
            >
              <Eye size={14} />
            </button>
            {onRemove && (
              <button
                onClick={() => onRemove(photo.id)}
                className="p-1.5 rounded-full bg-[var(--noir-2)] text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--noir-2)] focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]"
                aria-label={`Remove ${photo.filename}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
          {!photo.extractedText && (
            <span className="absolute top-1 left-1 text-[8px] font-mono px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,107,53,0.85)', color: '#fff' }}>
              BLIND
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function CaseIntake() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCase, fetchCase } = useCaseStore();
  const { logs, status, connectSSE, disconnectSSE, triggerAgent, clearLogs } = useAgentStore();
  const [uploading, setUploading] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState<number | null>(null);

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

  const stageOrder = ['intake', 'research', 'drafting', 'qa', 'export'];
  const currentIdx = stageOrder.indexOf(activeCase?.stage || 'intake');
  const completedStages = stageOrder.slice(0, currentIdx);

  const findings = logs
    .filter(l => l.type === 'finding')
    .map((l, i) => ({
      id: `f-${i}`,
      message: l.message,
      confidence: l.metadata?.confidence as number | undefined,
      attackPattern: l.metadata?.attackPattern as string | undefined,
    }));

  const intakeResult = useMemo(() => {
    const completeLog = [...logs].reverse().find((l) => l.type === 'complete');
    return parseIntakeFromMetadata(completeLog?.metadata);
  }, [logs]);

  const { data: notesData } = useQuery({
    queryKey: ['notes', id],
    queryFn: () => api.getNotes(id!),
    enabled: !!id,
  });
  const noteCount = notesData?.notes.length ?? 0;

  const checkpointSummary = intakeResult
    ? `Intake complete — ${intakeResult.documents.length} document${intakeResult.documents.length === 1 ? '' : 's'} catalogued${
        noteCount > 0 ? `, ${noteCount} note${noteCount === 1 ? '' : 's'} reviewed` : ''
      }${intakeResult.flags.length > 0 ? `, ${intakeResult.flags.length} flag${intakeResult.flags.length === 1 ? '' : 's'}` : ''
      }${intakeResult.missingFields.length > 0 ? `, ${intakeResult.missingFields.length} missing field${intakeResult.missingFields.length === 1 ? '' : 's'}` : ''}.`
    : 'Intake analysis complete — case classified, jurisdiction confirmed, opposing expert flagged.';

  const { error } = useCaseStore();
  if (error) return (
    <div className="p-8 text-center">
      <p className="text-[var(--color-error)] text-sm mb-2">Failed to load case</p>
      <p className="text-[var(--color-text-muted)] text-xs">{error}</p>
    </div>
  );

  if (!activeCase) return <div className="p-6"><SkeletonLoader type="card" count={3} /></div>;

  const textDocs = activeCase.documents.filter(d => !isImageDoc(d));
  const photoDocs = activeCase.documents.filter(d => isImageDoc(d));

  const cardStyle: React.CSSProperties = {
    background: 'var(--noir-1)',
    border: '1px solid var(--noir-3)',
    borderRadius: '16px',
    padding: '24px',
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-muted)',
    marginBottom: '12px',
  };

  return (
    <div className="page-enter">
      <Header
        title={activeCase.name}
        subtitle={`${activeCase.reportType || 'Initial'} Report — ${activeCase.jurisdiction || 'Clark County'}`}
      />
      <StageNavV2
        currentStage={(activeCase.stage || 'intake') as 'intake' | 'research' | 'drafting' | 'qa' | 'export'}
        completedStages={completedStages}
        agentRunning={status === 'running'}
        onNavigate={stageNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left — Capture surface (three stacked cards) + action */}
        <div className="lg:col-span-2 space-y-4">

          {/* Unified intake dropzone */}
          <div style={cardStyle}>
            <p style={sectionLabel}>Add Case Materials</p>
            <FileDropzone
              documents={activeCase.documents}
              uploading={uploading}
              onFiles={handleFiles}
              hint="Drop PDFs, DOCX, photos — all file types accepted"
              showList={false}
            />
          </div>

          {/* Documents card */}
          <div style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} style={{ color: 'var(--signal-amber)' }} />
              <p style={{ ...sectionLabel, marginBottom: 0 }}>
                Documents
              </p>
              <span className="ml-auto text-[10px] font-mono text-[var(--color-text-muted)]">{textDocs.length}</span>
            </div>
            {textDocs.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-3">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {textDocs.map(doc => <DocRow key={doc.id} doc={doc} />)}
              </div>
            )}
          </div>

          {/* Photos card */}
          <div style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Image size={14} style={{ color: 'var(--signal-amber)' }} />
              <p style={{ marginBottom: 0, ...sectionLabel }}>
                Photos
              </p>
              <span className="ml-auto text-[10px] font-mono text-[var(--color-text-muted)]">{photoDocs.length}</span>
            </div>
            {photoDocs.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-3">No photos uploaded yet.</p>
            ) : (
              <PhotoGrid
                photos={photoDocs}
                onPreview={(i) => setPreviewPhotoIndex(i)}
              />
            )}
          </div>

          {/* Notes card */}
          <div style={cardStyle}>
            <p style={sectionLabel}>Notes</p>
            <NoteList caseId={id!} />
          </div>

          {/* Step 2: Run Analysis */}
          <div style={cardStyle}>
            <p style={sectionLabel}>Run Analysis</p>
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
          <AgentActivityFeedV2 logs={logs} stage="intake" status={status} />
        </div>
      </div>

      {/* Photo preview modal */}
      {previewPhotoIndex !== null && photoDocs.length > 0 && (
        <ImagePreviewModal
          images={photoDocs}
          initialIndex={previewPhotoIndex}
          currentIndex={previewPhotoIndex}
          onNavigate={setPreviewPhotoIndex}
          onClose={() => setPreviewPhotoIndex(null)}
        />
      )}

      {/* Human Checkpoint */}
      {showCheckpoint && (
        <HumanCheckpointV2
          stage="intake"
          summary={checkpointSummary}
          findings={findings}
          documentCount={activeCase.documents.length}
          onApprove={handleApprove}
          onRevise={handleRevise}
          onReject={() => setShowCheckpoint(false)}
        />
      )}
    </div>
  );
}
