import BearMark from './BearMark';
import type { QAScorecard } from '../../lib/api';

interface QADashboardProps {
  scorecard: QAScorecard | null;
  loaded: boolean;
  running: boolean;
  actionSlot?: React.ReactNode;
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 85 ? 'var(--color-success)' : score >= 70 ? 'var(--color-warning)' : 'var(--color-error)';
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--color-border)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r="44" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-[var(--color-text-muted)]">/ 100</span>
      </div>
    </div>
  );
}

export default function QADashboard({ scorecard, loaded, running, actionSlot }: QADashboardProps) {
  const score = scorecard?.score ?? 0;
  const checks = scorecard?.checks ?? [];
  const passCount = checks.filter((c) => c.status === 'pass').length;

  const bearFilter = score >= 85
    ? 'hue-rotate(80deg) brightness(1.2)'
    : score < 70
      ? 'saturate(2)'
      : undefined;

  return (
    <div className="v2-surface rounded-2xl p-8 text-center relative overflow-hidden">
      {running
        ? <BearMark variant="pulse" />
        : <BearMark variant="watermark" opacity={0.05} className={bearFilter ? `[filter:${bearFilter}]` : ''} />
      }
      <div className="relative z-10">
        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Quality Score</p>
        {scorecard ? (
          <>
            <ScoreGauge score={score} />
            <p className="text-sm text-[var(--color-text-secondary)] mt-4">
              {passCount}/{checks.length} checks passed — {score >= 85 ? 'Courtroom ready' : score >= 70 ? 'Marginal — review flagged items' : 'Needs revision'}
              {scorecard.benchmarkMatch !== undefined && (
                <span className="block text-xs text-[var(--color-text-muted)] mt-1">
                  Benchmark match: {scorecard.benchmarkMatch}/100
                </span>
              )}
            </p>
          </>
        ) : (
          <div className="py-6">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {loaded ? 'QA not yet run for this case.' : 'Loading scorecard…'}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              Run the QA agent to generate a structured scorecard from the current draft.
            </p>
          </div>
        )}
        {actionSlot && <div className="mt-4">{actionSlot}</div>}
      </div>
    </div>
  );
}
