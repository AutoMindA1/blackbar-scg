import { Scale, Target } from 'lucide-react';
import type { Citation } from './CitationCard';

interface ResearchSummaryProps {
  citations: Citation[];
  /** Optional ENTERPRISE_BRAIN §6 ATK code → friendly label map */
  attackLabels?: Record<string, string>;
}

const DEFAULT_ATK_LABELS: Record<string, string> = {
  'ATK-01': 'Credential attack',
  'ATK-02': 'Code edition-in-force',
  'ATK-03': 'Surveillance — no notice',
  'ATK-04': 'Footwear & gait',
  'ATK-05': 'Outside their lane',
  'ATK-06': 'Open & obvious',
  'ATK-07': 'Omission attack',
  'ATK-08': 'Instrumentation defense',
  'ATK-09': 'Exemplar / recreation',
  'ATK-10': 'Physical description dismantling',
};

export default function ResearchSummary({ citations, attackLabels = DEFAULT_ATK_LABELS }: ResearchSummaryProps) {
  // Tally attack patterns referenced in any finding
  const tally = new Map<string, number>();
  for (const c of citations) {
    const code = c.attackPattern || (c.reference?.match(/ATK-\d+/i)?.[0] ?? null);
    if (code) {
      const norm = code.toUpperCase();
      tally.set(norm, (tally.get(norm) ?? 0) + 1);
    }
  }
  const topPatterns = Array.from(tally.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Average confidence
  const confidences = citations.map((c) => c.confidence).filter((v): v is number => typeof v === 'number');
  const avgConfidence = confidences.length > 0
    ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
    : null;

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Scale className="w-4 h-4 text-[var(--color-accent-secondary)]" />
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Research Summary</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--color-bg-elevated)] rounded-xl p-3">
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Findings</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{citations.length}</p>
        </div>
        <div className="bg-[var(--color-bg-elevated)] rounded-xl p-3">
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Avg Confidence</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
            {avgConfidence !== null ? `${avgConfidence}%` : '—'}
          </p>
        </div>
      </div>

      {topPatterns.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3 h-3 text-[var(--color-accent-primary)]" />
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Recommended Attack Patterns</p>
          </div>
          <ul className="space-y-1.5">
            {topPatterns.map(([code, count]) => (
              <li key={code} className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-primary)]">
                  <span className="font-mono text-[var(--color-accent-primary)] mr-2">{code}</span>
                  {attackLabels[code] || ''}
                </span>
                <span className="font-mono text-[10px] text-[var(--color-text-muted)]">×{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
