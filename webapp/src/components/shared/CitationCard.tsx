import { BookOpen, Quote } from 'lucide-react';

export interface Citation {
  id: string;
  /** What the opposing expert claims (quoted) */
  claim?: string;
  /** Code or standard reference, e.g. "ANSI A326.3 §6.1" or "ATK-07" */
  reference?: string;
  /** SCG's reasoning / rebuttal angle */
  reasoning: string;
  /** Optional source document + page reference */
  source?: string;
  confidence?: number;
  attackPattern?: string;
}

interface CitationCardProps {
  citation: Citation;
}

export default function CitationCard({ citation }: CitationCardProps) {
  return (
    <div className="glass rounded-xl p-5 space-y-3 card-hover">
      <div className="flex items-center justify-between gap-2">
        {(citation.attackPattern || citation.reference) && (
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]">
            {citation.attackPattern || citation.reference}
          </span>
        )}
        {citation.confidence !== undefined && (
          <span className="text-xs font-mono text-[var(--color-info)]">
            {Math.round(citation.confidence * 100)}%
          </span>
        )}
      </div>

      {citation.claim && (
        <div className="border-l-2 border-[var(--color-border)] pl-3 py-1">
          <Quote className="w-3 h-3 text-[var(--color-text-muted)] inline mr-1" />
          <span className="text-[11px] text-[var(--color-text-muted)] italic">{citation.claim}</span>
        </div>
      )}

      {citation.reference && citation.attackPattern && (
        <p className="text-[11px] font-mono text-[var(--color-accent-secondary)]">{citation.reference}</p>
      )}

      <p className="text-xs text-[var(--color-text-primary)] leading-relaxed">{citation.reasoning}</p>

      {citation.source && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--color-border)]">
          <BookOpen className="w-3 h-3 text-[var(--color-text-muted)]" />
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{citation.source}</span>
        </div>
      )}
    </div>
  );
}
