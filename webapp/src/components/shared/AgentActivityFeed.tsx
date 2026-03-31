import { useEffect, useRef } from 'react';
import { Activity, CheckCircle, AlertTriangle, Search, Loader2 } from 'lucide-react';
import type { SSEMessage } from '../../lib/api';

interface Props { logs: SSEMessage[]; }

const ICONS: Record<string, typeof Activity> = {
  progress: Loader2, finding: Search, complete: CheckCircle, error: AlertTriangle, connected: Activity,
};

const COLORS: Record<string, string> = {
  progress: 'text-accent-secondary', finding: 'text-accent-primary', complete: 'text-success', error: 'text-error', connected: 'text-text-muted',
};

export default function AgentActivityFeed({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs.length]);

  return (
    <div className="glass rounded-xl p-4 max-h-96 overflow-y-auto">
      <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" /> Agent Activity
      </h3>
      {logs.length === 0 && <p className="text-xs text-text-muted">No activity yet.</p>}
      <div className="space-y-2">
        {logs.map((log, i) => {
          const Icon = ICONS[log.type] || Activity;
          const color = COLORS[log.type] || 'text-text-muted';
          return (
            <div key={i} className="flex gap-2 text-xs">
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${color} ${log.type === 'progress' ? 'animate-spin' : ''}`} />
              <span className="text-text-secondary leading-relaxed">{log.message}</span>
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
