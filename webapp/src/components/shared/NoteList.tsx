import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api, type Note } from '../../lib/api';

interface Props {
  caseId: string;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const NOTE_PREVIEW_LEN = 60;
const NOTES_DISPLAY_CAP = 100;

export default function NoteList({ caseId }: Props) {
  const qc = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['notes', caseId],
    queryFn: () => api.getNotes(caseId),
  });

  const createMutation = useMutation({
    mutationFn: (body: string) => api.createNote(caseId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes', caseId] });
      setDraft('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => api.deleteNote(caseId, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', caseId] }),
  });

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      const trimmed = draft.trim();
      if (trimmed) createMutation.mutate(trimmed);
    }
    if (e.key === 'Escape') {
      setDraft('');
      textareaRef.current?.blur();
    }
  }, [draft, createMutation]);

  const notes: Note[] = data?.notes ?? [];
  const atCap = notes.length >= NOTES_DISPLAY_CAP;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Compose */}
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a note — Ctrl+Enter to save"
        rows={3}
        style={{
          width: '100%',
          background: 'var(--noir-2)',
          color: 'var(--bone)',
          border: '1px solid var(--noir-3)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          fontFamily: 'var(--font-ui-v2)',
          fontSize: 'var(--fs-body)',
          lineHeight: 'var(--lh-body)',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        className="v2-focus-ring"
      />

      {/* Skeleton */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 48,
                background: 'var(--noir-2)',
                borderRadius: 'var(--radius-md)',
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notes.length === 0 && (
        <p style={{
          color: 'var(--bone-dim)',
          fontSize: 'var(--fs-small)',
          textAlign: 'center',
          padding: 'var(--space-4) 0',
          margin: 0,
        }}>
          No notes yet — type one above.
        </p>
      )}

      {/* Note cards */}
      {!isLoading && notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {notes.map((note) => {
            const isExpanded = expandedId === note.id;
            const preview = note.body.length > NOTE_PREVIEW_LEN
              ? note.body.slice(0, NOTE_PREVIEW_LEN) + '…'
              : note.body;

            return (
              <div
                key={note.id}
                className="v2-surface"
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  cursor: 'pointer',
                  animation: 'noteEnter var(--duration-base) var(--ease-forensic)',
                }}
                onClick={() => setExpandedId(isExpanded ? null : note.id)}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <span className="v2-micro">{formatRelativeTime(note.createdAt)}</span>
                  <button
                    className="v2-focus-ring"
                    aria-label="Delete note"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(note.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--bone-dim)',
                      padding: 'var(--space-1)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color var(--duration-fast) var(--ease-forensic)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--verdict-red)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--bone-dim)')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Body */}
                <p style={{
                  margin: 0,
                  color: 'var(--bone)',
                  fontSize: 'var(--fs-small)',
                  lineHeight: 'var(--lh-body)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {isExpanded ? note.body : preview}
                </p>
              </div>
            );
          })}

          {/* Cap hint */}
          {atCap && (
            <p className="v2-micro" style={{ textAlign: 'center', color: 'var(--bone-dim)', fontSize: 'var(--fs-small)' }}>
              Showing most recent 100 notes.
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes noteEnter {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes noteEnter { from { opacity: 1; } }
        }
      `}</style>
    </div>
  );
}
