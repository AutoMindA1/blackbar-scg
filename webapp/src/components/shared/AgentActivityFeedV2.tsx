import { useEffect, useRef, useState } from 'react';
import { Search, Check, AlertTriangle, Loader2, Activity, ArrowDown } from 'lucide-react';
import BearMark from './BearMark';
import type { SSEMessage } from '../../lib/api';

interface AgentActivityFeedV2Props {
  logs: SSEMessage[];
  stage: string;
  status: 'idle' | 'running' | 'complete' | 'error';
}

function getIcon(type: string) {
  switch (type) {
    case 'progress': return <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)]" />;
    case 'finding': return <Search size={14} className="text-[var(--color-info)]" />;
    case 'complete': return <Check size={14} className="text-[var(--color-success)]" />;
    case 'error': return <AlertTriangle size={14} className="text-[var(--color-error)]" />;
    case 'connected': return <Activity size={14} className="text-[var(--color-text-muted)]" />;
    default: return <Activity size={14} className="text-[var(--color-text-muted)]" />;
  }
}

// Parse "Brain §X" references into chips
function renderMessage(message: string) {
  const parts = message.split(/(Brain §\d+|§\d+\s[A-Za-z &]+)/g);
  return parts.map((part, i) => {
    if (/^(Brain )?§\d+/.test(part)) {
      return (
        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)] mx-0.5">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function AgentActivityFeedV2({ logs, status }: AgentActivityFeedV2Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Elapsed timer while running
  useEffect(() => {
    if (status !== 'running') return;
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(interval);
  }, [status, startTime]);

  // Auto-scroll
  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length, isAtBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 40);
  };

  const jumpToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  };

  // Empty state
  if (logs.length === 0 && status === 'idle') {
    return (
      <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 min-h-[280px] flex items-center justify-center">
        <BearMark variant="watermark" opacity={0.08} />
        <div className="relative z-10 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Agent standing by</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Click the action button to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden">
      {/* Bear background based on status */}
      {status === 'running' && <BearMark variant="pulse" />}
      {status === 'complete' && <BearMark variant="glow" />}
      {status === 'idle' && logs.length > 0 && <BearMark variant="watermark" />}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">Agent Activity</span>
        {status === 'running' && (
          <span className="text-xs font-mono text-[var(--color-accent-primary)]">
            {(elapsed / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative z-10 max-h-80 overflow-y-auto p-3 space-y-1.5"
      >
        {logs.filter(l => l.type !== 'connected').map((log, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
              log.type === 'finding'
                ? 'bg-[var(--color-info)]/8 border border-[var(--color-info)]/15'
                : log.type === 'complete'
                  ? 'bg-[var(--color-success)]/8 border border-[var(--color-success)]/15'
                  : log.type === 'error'
                    ? 'bg-[var(--color-error)]/8 border border-[var(--color-error)]/15'
                    : 'hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            <span className="mt-0.5 shrink-0">{getIcon(log.type)}</span>
            <span className="text-[var(--color-text-secondary)] leading-relaxed">
              {renderMessage(log.message)}
            </span>
            {log.metadata?.confidence !== undefined && (
              <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--color-info)]/15 text-[var(--color-info)]">
                {Math.round((log.metadata.confidence as number) * 100)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Jump to bottom */}
      {!isAtBottom && (
        <button
          onClick={jumpToBottom}
          className="absolute bottom-3 right-3 z-20 flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowDown size={12} /> Latest
        </button>
      )}
    </div>
  );
}
