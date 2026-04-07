import { useState } from 'react';
import { CheckCircle, AlertTriangle, ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react';
import type { QAScorecard } from '../../lib/api';

interface CheckResultsProps {
  checks: QAScorecard['checks'];
}

export default function CheckResults({ checks }: CheckResultsProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  if (checks.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-4">Check Results</h3>
      <div className="space-y-2">
        {checks.map((check, i) => (
          <div key={`${check.name}-${i}`} className="rounded-xl bg-[var(--color-bg-elevated)] overflow-hidden">
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-3 py-3 px-4 text-left hover:bg-[var(--color-bg-glass)] transition-colors"
            >
              {check.status === 'pass'
                ? <CheckCircle className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                : check.status === 'warning'
                  ? <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
                  : <ShieldAlert className="w-4 h-4 text-[var(--color-error)] shrink-0" />
              }
              <span className="text-xs text-[var(--color-text-primary)] font-medium flex-1">{check.name}</span>
              <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-full ${
                check.status === 'pass'
                  ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                  : check.status === 'warning'
                    ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                    : 'bg-[var(--color-error)]/20 text-[var(--color-error)]'
              }`}>{check.status}</span>
              {expanded.has(i) ? <ChevronDown size={12} className="text-[var(--color-text-muted)]" /> : <ChevronRight size={12} className="text-[var(--color-text-muted)]" />}
            </button>
            {expanded.has(i) && (
              <div className="px-4 pb-3 pt-0">
                <p className="text-[11px] text-[var(--color-text-secondary)] pl-7">{check.detail}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
