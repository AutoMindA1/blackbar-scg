import { useState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';

interface RevisionPanelProps {
  onSubmit: (notes: string) => Promise<void> | void;
  disabled?: boolean;
}

export default function RevisionPanel({ onSubmit, disabled }: RevisionPanelProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = notes.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-[var(--color-accent-secondary)]" />
        <h3 className="text-xs font-semibold text-[var(--color-text-secondary)]">Request Revision</h3>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What should the Drafting agent change? e.g. 'Section 4 is too aggressive — soften the framing.'"
        className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg p-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-primary)] resize-none"
        rows={4}
        disabled={disabled || submitting}
      />
      <button
        onClick={handleSubmit}
        disabled={!notes.trim() || disabled || submitting}
        className="w-full flex items-center justify-center gap-2 bg-[var(--color-accent-secondary)] hover:opacity-90 text-white font-semibold py-2 rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
        {submitting ? 'Re-running drafting agent…' : 'Submit Revision'}
      </button>
    </div>
  );
}
