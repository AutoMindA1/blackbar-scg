import { Loader2 } from 'lucide-react';
import BearMark from './BearMark';

interface ContextualActionButtonProps {
  stage: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  onAction: () => void;
  disabled?: boolean;
}

const stageConfig: Record<string, {
  idleText: string;
  idleSubtext: string;
  runningText: string;
  completeText: string;
}> = {
  intake: {
    idleText: 'Analyze Documents',
    idleSubtext: 'Classify case, confirm jurisdiction, flag opposing expert',
    runningText: 'Analyzing...',
    completeText: 'Analysis Complete — Review Below',
  },
  research: {
    idleText: 'Run Research',
    idleSubtext: 'Resolve flags, identify attack patterns, catalog citations',
    runningText: 'Researching...',
    completeText: 'Research Complete',
  },
  drafting: {
    idleText: 'Generate Draft',
    idleSubtext: 'Draft report in Lane\'s voice using research findings',
    runningText: 'Drafting...',
    completeText: 'Draft Complete',
  },
  qa: {
    idleText: 'Run QA Audit',
    idleSubtext: 'Check voice, terms, dates, format, benchmark similarity',
    runningText: 'Auditing...',
    completeText: 'QA Complete',
  },
};

export default function ContextualActionButton({ stage, status, onAction, disabled }: ContextualActionButtonProps) {
  const config = stageConfig[stage] || stageConfig.intake;

  if (status === 'complete') {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
        <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
        <span className="text-sm font-medium text-[var(--color-success)]">{config.completeText}</span>
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/20 pulse-accent">
        <BearMark variant="icon" size="sm" className="animate-pulse" />
        <Loader2 size={16} className="animate-spin text-[var(--color-accent-primary)]" />
        <span className="text-sm font-medium text-[var(--color-accent-primary)]">{config.runningText}</span>
      </div>
    );
  }

  return (
    <button
      onClick={onAction}
      disabled={disabled}
      className="w-full group relative overflow-hidden rounded-xl bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all px-5 py-4 text-left"
    >
      <div className="flex items-center gap-3">
        <BearMark variant="icon" size="sm" />
        <div>
          <div className="text-sm font-semibold text-white">{config.idleText}</div>
          <div className="text-xs text-white/70 mt-0.5">{config.idleSubtext}</div>
        </div>
      </div>
    </button>
  );
}
