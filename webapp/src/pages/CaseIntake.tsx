import { useEffect, useMemo, useState, useCallback, useId } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Image as ImageIcon,
  StickyNote,
  Eye,
  Trash2,
  Loader2,
  ArrowRight,
  Pencil,
  X,
} from 'lucide-react';
import Header from '../components/layout/Header';
import StageNavV2 from '../components/shared/StageNavV2';
import AgentActivityFeedV2 from '../components/shared/AgentActivityFeedV2';
import HumanCheckpointV2 from '../components/shared/HumanCheckpointV2';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import ImagePreviewModal from '../components/shared/ImagePreviewModal';
import BearMark from '../components/shared/BearMark';
import PatternCToast from '../components/shared/PatternCToast';
import CaseForm from '../components/shared/CaseForm';
import { useCaseStore } from '../stores/caseStore';
import { useAgentStore } from '../stores/agentStore';
import { useAuthStore } from '../stores/authStore';
import { api, parseIntakeFromMetadata } from '../lib/api';
import type { Doc, Note } from '../lib/api';

/**
 * CaseIntake — UI_REFERENCE_v1.html §05 Unified Capture.
 *
 * Files, notes, photos in one scroll. One drop target. The Intake agent
 * reasons over all three as first-class inputs. No tabs, no separate forms;
 * the prior three-stacked-cards layout is gone.
 *
 * Right rail: read-only case summary card + "Run Intake agent" CTA + the
 * "agent sees N docs and N notes" caption. CaseForm (matter type / report
 * type / jurisdiction edit) is removed from this surface — those fields are
 * set during case creation and aren't re-edited from intake per §05. If a
 * later flow needs inline edit, it lands on top of the summary card.
 */

const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|bmp|tiff?)$/i;
function isImageDoc(doc: Doc): boolean { return IMAGE_EXTS.test(doc.filename); }

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function formatBytes(n: number | null): string {
  if (n === null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 48) return 'yesterday';
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const cardBase: React.CSSProperties = {
  background: 'var(--noir-1)',
  border: '1px solid var(--noir-3)',
  borderRadius: 'var(--radius-lg)',
  padding: '20px 24px',
  display: 'grid',
  gridTemplateColumns: '48px 1fr auto',
  gap: '16px',
  alignItems: 'center',
};

const iconWell: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--noir-2)',
};

const nameStyle: React.CSSProperties = {
  fontWeight: 500,
  letterSpacing: '-0.005em',
  color: 'var(--bone)',
  fontSize: '0.9375rem',
};

const metaStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--bone-muted)',
  marginTop: 2,
  fontFamily: 'var(--font-mono-v2)',
};

const summaryRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.875rem',
  color: 'var(--bone)',
};

interface MaterialFile {
  kind: 'file';
  doc: Doc;
}
interface MaterialPhoto {
  kind: 'photo';
  doc: Doc;
}
interface MaterialNote {
  kind: 'note';
  note: Note;
}
type Material = MaterialFile | MaterialPhoto | MaterialNote;

function materialTimestamp(m: Material): number {
  if (m.kind === 'note') return new Date(m.note.createdAt).getTime();
  return new Date(m.doc.uploadedAt).getTime();
}

export default function CaseIntake() {
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
  } = useAgentStore();
  const queryClient = useQueryClient();
  const fileInputId = useId();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [showEditDetails, setShowEditDetails] = useState(false);

  const userRole = useAuthStore((s) => s.user?.role);
  const canEditDetails = userRole === 'expert' || userRole === 'admin';

  const handleSaveDetails = useCallback(async (values: Record<string, unknown>) => {
    if (!id) return;
    await api.updateCase(id, values);
    await fetchCase(id);
    setShowEditDetails(false);
  }, [id, fetchCase]);

  // Esc closes the edit-details modal
  useEffect(() => {
    if (!showEditDetails) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowEditDetails(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showEditDetails]);

  useEffect(() => {
    if (id) { fetchCase(id); connectSSE(id); }
    return () => disconnectSSE();
  }, [id, fetchCase, connectSSE, disconnectSSE]);

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

  const handleFiles = useCallback(async (files: File[]) => {
    if (!id) return;
    setUploading(true);
    try {
      await api.uploadDocuments(id, files);
      await fetchCase(id);
    } finally { setUploading(false); }
  }, [id, fetchCase]);

  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['notes', id],
    queryFn: () => api.getNotes(id!),
    enabled: !!id,
  });
  const notes: Note[] = useMemo(() => notesData?.notes ?? [], [notesData]);

  const createNote = useMutation({
    mutationFn: (body: string) => api.createNote(id!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', id] });
      setNoteDraft('');
    },
  });
  const deleteNote = useMutation({
    mutationFn: (noteId: string) => api.deleteNote(id!, noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', id] }),
  });

  const handleStartAnalysis = async () => {
    if (!id) return;
    clearLogs();
    await triggerAgent(id, 'intake');
  };

  const handleApprove = async () => {
    if (!id) return;
    const { nextStage } = await api.approve(id, 'intake', 'approve');
    clearHITLEvent();
    navigate(`/cases/${id}/${nextStage}`);
  };

  const handleRevise = async (revisionNotes: string) => {
    if (!id) return;
    await api.approve(id, 'intake', 'revise', revisionNotes);
    clearLogs();
    clearHITLEvent();
    await triggerAgent(id, 'intake', revisionNotes);
  };

  const superviseClosely = activeCase?.patternCOverride?.superviseClosely ?? false;
  const handleSuperviseToggle = useCallback(async () => {
    if (!id) return;
    await api.updatePatternCOverride(id, { superviseClosely: !superviseClosely });
    await fetchCase(id);
  }, [id, superviseClosely, fetchCase]);

  const stageOrder = ['intake', 'research', 'drafting', 'qa', 'export'];
  const currentIdx = stageOrder.indexOf(activeCase?.stage || 'intake');
  const completedStages = stageOrder.slice(0, currentIdx);

  const findings = logs
    .filter((l) => l.type === 'finding')
    .map((l, i) => ({
      id: `f-${i}`,
      message: l.message,
      confidence: l.metadata?.confidence as number | undefined,
      attackPattern: l.metadata?.attackPattern as string | undefined,
    }));

  const intakeResult = useMemo(() => {
    const evt = [...logs]
      .reverse()
      .find((l) => l.type === 'auto_advance' || l.type === 'hitl_required');
    return parseIntakeFromMetadata(evt?.metadata);
  }, [logs]);

  // Build the unified material list (files + photos + notes), oldest first
  const materials: Material[] = useMemo(() => {
    if (!activeCase) return [];
    const list: Material[] = [];
    activeCase.documents.forEach((doc) => {
      list.push(isImageDoc(doc) ? { kind: 'photo', doc } : { kind: 'file', doc });
    });
    notes.forEach((note) => list.push({ kind: 'note', note }));
    return list.sort((a, b) => materialTimestamp(a) - materialTimestamp(b));
  }, [activeCase, notes]);

  const photoDocs = activeCase?.documents.filter(isImageDoc) ?? [];
  const blindPhotos = photoDocs.filter((p) => !p.extractedText);
  const photoCount = photoDocs.length;
  const docCount = (activeCase?.documents.length ?? 0) - photoCount;
  const noteCount = notes.length;

  const stageNavigate = (stage: string) => navigate(`/cases/${id}/${stage}`);

  const noteCheckpointSummary = intakeResult
    ? `Intake complete — ${intakeResult.documents.length} document${intakeResult.documents.length === 1 ? '' : 's'} catalogued${
        noteCount > 0 ? `, ${noteCount} note${noteCount === 1 ? '' : 's'} reviewed` : ''
      }${intakeResult.flags.length > 0 ? `, ${intakeResult.flags.length} flag${intakeResult.flags.length === 1 ? '' : 's'}` : ''
      }${intakeResult.missingFields.length > 0 ? `, ${intakeResult.missingFields.length} missing field${intakeResult.missingFields.length === 1 ? '' : 's'}` : ''}.`
    : 'Intake analysis complete — case classified, jurisdiction confirmed, opposing expert flagged.';

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleNoteSubmit = () => {
    const trimmed = noteDraft.trim();
    if (trimmed) createNote.mutate(trimmed);
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleNoteSubmit();
    }
  };

  const { error } = useCaseStore();
  if (error) return (
    <div className="p-8 text-center">
      <p style={{ color: 'var(--verdict-red)', fontSize: '0.875rem', marginBottom: '8px' }}>Failed to load case</p>
      <p style={{ color: 'var(--bone-muted)', fontSize: '0.75rem' }}>{error}</p>
    </div>
  );
  if (!activeCase) return <div className="p-6"><SkeletonLoader type="card" count={3} /></div>;

  return (
    <div className="page-enter">
      <Header
        title={activeCase.name}
        subtitle={`${activeCase.reportType || 'Initial'} report — ${activeCase.jurisdiction || 'Clark County'}`}
        action={
          <button
            onClick={handleSuperviseToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              superviseClosely
                ? 'bg-[var(--signal-amber-soft)] text-[var(--signal-amber)] border border-[var(--signal-amber-border)]'
                : 'text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }`}
            aria-pressed={superviseClosely}
            title="When on, every agent stage opens the approval modal regardless of confidence (Pattern A for this case)."
          >
            <Eye size={12} />
            Supervise closely
          </button>
        }
      />
      <StageNavV2
        currentStage={(activeCase.stage || 'intake') as 'intake' | 'research' | 'drafting' | 'qa' | 'export'}
        completedStages={completedStages}
        agentRunning={status === 'running'}
        onNavigate={stageNavigate}
      />

      {/* §05 unified capture: 1fr / 320px */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: '24px',
          alignItems: 'start',
          marginTop: '24px',
        }}
      >
        {/* Left — materials list + note composer + drop zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* §05 materials header */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display-v2)',
                fontWeight: 500,
                fontSize: '1.5rem',
                letterSpacing: '-0.015em',
                fontVariationSettings: '"opsz" 80',
                color: 'var(--bone)',
                margin: 0,
              }}
            >
              Case materials
            </h2>
            <span style={{ fontSize: '0.8125rem', color: 'var(--bone-muted)' }}>Drag any file, or paste text</span>
          </div>

          {/* Empty state when nothing captured yet */}
          {materials.length === 0 && !notesLoading && (
            <div
              className="v2-surface"
              style={{ padding: '48px 24px', textAlign: 'center' }}
            >
              <BearMark variant="watermark" opacity={0.06} />
              <p
                style={{
                  fontFamily: 'var(--font-display-v2)',
                  fontWeight: 500,
                  fontSize: '1.125rem',
                  letterSpacing: '-0.015em',
                  color: 'var(--bone)',
                  marginBottom: '8px',
                }}
              >
                No materials yet.
              </p>
              <p style={{ color: 'var(--bone-muted)', fontSize: '0.8125rem' }}>
                Drop a PDF, take a photo, or jot a note — the Intake agent reads all three.
              </p>
            </div>
          )}

          {/* Material cards */}
          {materials.map((m) => {
            if (m.kind === 'file') {
              const d = m.doc;
              return (
                <div key={`file-${d.id}`} style={cardBase}>
                  <div style={{ ...iconWell, color: 'var(--bone)' }}>
                    <FileText size={20} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...nameStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.filename}</div>
                    <div style={metaStyle}>
                      {d.pageCount ?? '?'} pages · {formatBytes(d.sizeBytes)} · indexed
                    </div>
                  </div>
                  <span className="v2-pill v2-pill-complete" style={{ whiteSpace: 'nowrap' }}>indexed</span>
                </div>
              );
            }
            if (m.kind === 'photo') {
              const d = m.doc;
              const photoIdx = photoDocs.findIndex((p) => p.id === d.id);
              const isBlind = !d.extractedText;
              return (
                <div key={`photo-${d.id}`} style={cardBase}>
                  <div style={{ ...iconWell, color: 'var(--verdict-green)' }}>
                    <ImageIcon size={20} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        background: 'var(--noir-3)',
                        borderRadius: 'var(--radius-sm)',
                        flexShrink: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={`/uploads/${d.filepath.split('/').pop()}`}
                        alt={d.filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ ...nameStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.filename}</div>
                      <div style={metaStyle}>{formatBytes(d.sizeBytes)} · {formatRelative(d.uploadedAt)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isBlind && (
                      <span
                        className="v2-pill v2-pill-blind"
                        title="Human review only. Agent does not read image content yet."
                      >
                        agent blind
                      </span>
                    )}
                    <button
                      onClick={() => setPreviewPhotoIndex(photoIdx)}
                      className="v2-focus-ring"
                      aria-label={`Preview ${d.filename}`}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--noir-3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '6px 10px',
                        color: 'var(--bone)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              );
            }
            // note
            const n = m.note;
            return (
              <div key={`note-${n.id}`} style={cardBase}>
                <div style={{ ...iconWell, color: 'var(--signal-amber)' }}>
                  <StickyNote size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      ...nameStyle,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {n.body}
                  </div>
                  <div style={metaStyle}>note · {formatRelative(n.createdAt)}</div>
                </div>
                <button
                  onClick={() => deleteNote.mutate(n.id)}
                  aria-label="Delete note"
                  className="v2-focus-ring"
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: 'var(--bone-dim)',
                    cursor: 'pointer',
                    padding: 6,
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--verdict-red)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--bone-dim)'; }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}

          {/* Inline note composer */}
          <div
            className="v2-surface"
            style={{ background: 'var(--noir-0)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              placeholder="Add a case note — anything you'd tell a colleague about this matter. The Intake agent reads these."
              rows={3}
              className="v2-focus-ring"
              style={{
                width: '100%',
                background: 'transparent',
                border: 0,
                color: 'var(--bone)',
                fontFamily: 'var(--font-ui-v2)',
                fontSize: '0.9375rem',
                lineHeight: 'var(--lh-body)',
                resize: 'vertical',
                outline: 'none',
                padding: 0,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--bone-muted)' }}>
                Notes flow into the Intake agent · Ctrl+Enter to save
              </span>
              <button
                onClick={handleNoteSubmit}
                disabled={!noteDraft.trim() || createNote.isPending}
                className="v2-btn v2-btn-primary"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.8125rem',
                  opacity: (!noteDraft.trim() || createNote.isPending) ? 0.5 : 1,
                  cursor: (!noteDraft.trim() || createNote.isPending) ? 'not-allowed' : 'pointer',
                }}
              >
                {createNote.isPending ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>

          {/* §05 drop zone — bear icon, two-line text, dashed border */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById(fileInputId)?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                document.getElementById(fileInputId)?.click();
              }
            }}
            className="v2-focus-ring"
            style={{
              border: '1px dashed var(--noir-3)',
              borderColor: dragOver ? 'var(--signal-amber)' : 'var(--noir-3)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px',
              textAlign: 'center',
              color: 'var(--bone-muted)',
              background: dragOver ? 'var(--signal-amber-soft)' : 'transparent',
              cursor: 'pointer',
              transition: 'all var(--duration-base) var(--ease-forensic)',
            }}
          >
            <input
              id={fileInputId}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files?.length) handleFiles(Array.from(e.target.files)); }}
            />
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
              <BearMark variant="icon" size="xs" />
            </div>
            <div style={{ color: dragOver ? 'var(--bone)' : 'var(--bone-muted)' }}>
              Drop files, photos, or paste a link.
            </div>
            <div style={{ fontSize: '0.8125rem', marginTop: 4, color: 'var(--bone-dim)' }}>
              PDF, DOCX, JPG, PNG · up to 25 MB each
            </div>
            {uploading && (
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', color: 'var(--signal-amber)' }}>
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Right — case summary + Run Intake CTA + activity (admin) */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 32 }}>
          <div className="v2-surface" style={{ padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="v2-micro" style={{ color: 'var(--bone-muted)' }}>Case summary</div>
              {canEditDetails && (
                <button
                  onClick={() => setShowEditDetails(true)}
                  aria-label="Edit case details"
                  className="v2-focus-ring"
                  style={{
                    background: 'transparent',
                    border: 0,
                    padding: 4,
                    color: 'var(--bone-dim)',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color var(--duration-fast) var(--ease-forensic)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--signal-amber)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--bone-dim)'; }}
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display-v2)',
                fontWeight: 500,
                fontSize: '1.25rem',
                letterSpacing: '-0.015em',
                fontVariationSettings: '"opsz" 80',
                color: 'var(--bone)',
                margin: 0,
                marginBottom: 16,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeCase.name}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeCase.caseType && (
                <div style={summaryRow}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--bone-muted)' }}>Matter type</span>
                  <span>{activeCase.caseType.replace(/_/g, ' ')}</span>
                </div>
              )}
              {activeCase.reportType && (
                <div style={summaryRow}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--bone-muted)' }}>Report type</span>
                  <span>{capitalize(activeCase.reportType)}</span>
                </div>
              )}
              {activeCase.opposingExpert && (
                <div style={summaryRow}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--bone-muted)' }}>Opposing</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{activeCase.opposingExpert}</span>
                </div>
              )}
              <div style={summaryRow}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--bone-muted)' }}>Documents</span>
                <span style={{ fontFamily: 'var(--font-mono-v2)' }}>{docCount}</span>
              </div>
              <div style={summaryRow}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--bone-muted)' }}>Notes</span>
                <span style={{ fontFamily: 'var(--font-mono-v2)' }}>{noteCount}</span>
              </div>
              <div style={summaryRow}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--bone-muted)' }}>Photos</span>
                <span style={{ fontFamily: 'var(--font-mono-v2)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {photoCount}
                  {blindPhotos.length > 0 && (
                    <span className="v2-pill v2-pill-blind" style={{ height: 20, padding: '0 8px', fontSize: '0.625rem' }}>
                      {blindPhotos.length} blind
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartAnalysis}
            disabled={activeCase.documents.length === 0 || status === 'running'}
            className="v2-btn v2-btn-primary"
            style={{
              width: '100%',
              justifyContent: 'space-between',
              padding: '14px 16px',
              opacity: (activeCase.documents.length === 0 || status === 'running') ? 0.5 : 1,
              cursor: (activeCase.documents.length === 0 || status === 'running') ? 'not-allowed' : 'pointer',
            }}
          >
            <span>{status === 'running' ? 'Intake agent running…' : 'Run Intake agent'}</span>
            {status === 'running' ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--bone-muted)' }}>
            The agent sees {docCount} doc{docCount === 1 ? '' : 's'} and {noteCount} note{noteCount === 1 ? '' : 's'}. It does not yet read image content for {photoCount} photo{photoCount === 1 ? '' : 's'}.
          </p>

          <AgentActivityFeedV2 logs={logs} stage="intake" status={status} />
        </aside>
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

      {/* Edit case details modal — opened from the pencil affordance on the
          summary card. Reuses CaseForm; modal is the chrome only. */}
      {showEditDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditDetails(false); }}
        >
          <div
            className="v2-surface-elevated page-enter"
            style={{ padding: '32px', width: '100%', maxWidth: '520px', position: 'relative' }}
          >
            <button
              onClick={() => setShowEditDetails(false)}
              aria-label="Close edit"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'transparent',
                border: 0,
                color: 'var(--bone-dim)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
            <h3
              style={{
                fontFamily: 'var(--font-display-v2)',
                fontWeight: 500,
                fontSize: '1.5rem',
                letterSpacing: '-0.015em',
                fontVariationSettings: '"opsz" 80',
                color: 'var(--bone)',
                marginBottom: 24,
              }}
            >
              Edit case details
            </h3>
            <CaseForm
              defaultOpen
              initial={{
                caseType: activeCase.caseType,
                reportType: activeCase.reportType,
                jurisdiction: activeCase.jurisdiction,
                opposingExpert: activeCase.opposingExpert,
                deadline: activeCase.deadline,
              }}
              onSave={handleSaveDetails}
            />
          </div>
        </div>
      )}

      {/* Pattern C checkpoint */}
      {showCheckpoint && (
        <HumanCheckpointV2
          stage="intake"
          summary={noteCheckpointSummary}
          findings={findings}
          documentCount={activeCase.documents.length}
          triggers={hitlEvent?.triggers}
          onApprove={handleApprove}
          onRevise={handleRevise}
          onReject={clearHITLEvent}
        />
      )}

      <PatternCToast message={toastMessage} />
    </div>
  );
}
