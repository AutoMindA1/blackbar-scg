import { useState, useEffect } from 'react';
import { CheckCircle, RotateCcw, XCircle, X } from 'lucide-react';

interface Props {
  stage: string;
  summary: string;
  onApprove: () => void;
  onRevise: (notes: string) => void;
  onReject: () => void;
  onClose: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  intake: 'Intake', research: 'Research', drafting: 'Drafting', qa: 'QA', export: 'Export',
};

export default function HumanCheckpoint({ stage, summary, onApprove, onRevise, onReject, onClose }: Props) {
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'actions' | 'revise'>('actions');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass rounded-2xl p-6 w-full max-w-lg glow-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-text-primary">
            {STAGE_LABELS[stage]} Checkpoint
          </h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-surface rounded-lg p-4 mb-4">
          <p className="text-sm text-text-secondary">{summary}</p>
        </div>

        {mode === 'actions' ? (
          <div className="flex gap-3">
            <button onClick={onApprove}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors font-medium text-sm">
              <CheckCircle className="w-4 h-4" /> Approve
            </button>
            <button onClick={() => setMode('revise')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-warning/20 text-warning rounded-lg hover:bg-warning/30 transition-colors font-medium text-sm">
              <RotateCcw className="w-4 h-4" /> Revise
            </button>
            <button onClick={onReject}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors font-medium text-sm">
              <XCircle className="w-4 h-4" /> Reject
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what needs revision..."
              className="w-full bg-surface border border-border rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <button onClick={() => { onRevise(notes); setNotes(''); setMode('actions'); }}
                disabled={!notes.trim()}
                className="flex-1 px-4 py-2.5 bg-warning/20 text-warning rounded-lg hover:bg-warning/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm">
                Submit Revision Notes
              </button>
              <button onClick={() => setMode('actions')}
                className="px-4 py-2.5 bg-surface text-text-muted rounded-lg hover:text-text-secondary text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
