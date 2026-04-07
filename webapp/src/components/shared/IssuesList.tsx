import { AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import type { QAScorecard } from '../../lib/api';

interface IssuesListProps {
  issues: QAScorecard['issues'];
}

const severityIcon = (sev: 'critical' | 'warning' | 'info') =>
  sev === 'critical'
    ? <ShieldAlert className="w-4 h-4 text-[var(--color-error)] shrink-0" />
    : sev === 'warning'
      ? <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
      : <Info className="w-4 h-4 text-[var(--color-info)] shrink-0" />;

const severityChipClass = (sev: 'critical' | 'warning' | 'info') =>
  sev === 'critical'
    ? 'bg-[var(--color-error)]/20 text-[var(--color-error)]'
    : sev === 'warning'
      ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
      : 'bg-[var(--color-info)]/20 text-[var(--color-info)]';

export default function IssuesList({ issues }: IssuesListProps) {
  if (issues.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-4">
        Issues ({issues.length})
      </h3>
      <ul className="space-y-3">
        {issues.map((issue, i) => (
          <li key={i} className="flex gap-3 rounded-xl bg-[var(--color-bg-elevated)] p-3">
            {severityIcon(issue.severity)}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-text-primary)]">{issue.description}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] font-mono mt-1">{issue.location}</p>
            </div>
            <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-full self-start ${severityChipClass(issue.severity)}`}>
              {issue.severity}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
