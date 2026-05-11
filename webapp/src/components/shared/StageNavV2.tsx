import { Check, Scale } from 'lucide-react';

interface StageNavV2Props {
  currentStage: 'intake' | 'research' | 'drafting' | 'qa' | 'export';
  completedStages: string[];
  agentRunning?: boolean;
  onNavigate: (stage: string) => void;
}

// v2: stage identity is position + pill status — no per-stage color tokens
const stages = [
  { key: 'intake', label: 'Intake' },
  { key: 'research', label: 'Research' },
  { key: 'drafting', label: 'Drafting' },
  { key: 'qa', label: 'QA' },
  { key: 'export', label: 'Export' },
] as const;

export default function StageNavV2({ currentStage, completedStages, agentRunning, onNavigate }: StageNavV2Props) {
  return (
    <nav className="flex items-center gap-1 px-4 py-3">
      {stages.map((stage, i) => {
        const isComplete = completedStages.includes(stage.key);
        const isCurrent = stage.key === currentStage;
        const isRunning = isCurrent && agentRunning;
        const isClickable = isComplete || isCurrent;

        return (
          <div key={stage.key} className="flex items-center">
            {/* Stage dot */}
            <button
              onClick={() => isClickable && onNavigate(stage.key)}
              disabled={!isClickable}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isCurrent
                  ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]'
                  : isComplete
                    ? 'hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] cursor-pointer'
                    : 'text-[var(--color-text-muted)] cursor-default'
              }`}
              title={
                isComplete
                  ? `${stage.label} — Completed`
                  : isRunning
                    ? `${stage.label} — Running...`
                    : isCurrent
                      ? `${stage.label} — Current`
                      : stage.label
              }
            >
              {/* Dot / icon */}
              <span className="relative flex items-center justify-center">
                {isComplete ? (
                  <span
                    className="flex items-center justify-center w-5 h-5 rounded-full"
                    style={{ backgroundColor: 'var(--signal-amber, #FF6B35)' }}
                  >
                    <Check size={12} className="text-[var(--color-bg-primary)]" strokeWidth={3} />
                  </span>
                ) : stage.key === 'qa' ? (
                  <span
                    className={`flex items-center justify-center w-5 h-5 rounded-full ${isRunning ? 'stage-pulse-ring' : ''}`}
                    style={{
                      color: isCurrent ? 'var(--signal-amber, #FF6B35)' : 'var(--color-text-muted)',
                      backgroundColor: isCurrent ? 'rgba(255,107,53,0.12)' : 'transparent',
                    }}
                  >
                    <Scale size={12} />
                  </span>
                ) : (
                  <span
                    className={`block w-3 h-3 rounded-full border-2 ${isRunning ? 'stage-pulse-ring' : ''}`}
                    style={{
                      borderColor: isCurrent ? 'var(--signal-amber, #FF6B35)' : 'var(--color-border)',
                      backgroundColor: isCurrent ? 'var(--signal-amber, #FF6B35)' : 'transparent',
                    }}
                  />
                )}
              </span>
              <span>{stage.label}</span>
            </button>

            {/* Connector line */}
            {i < stages.length - 1 && (
              <div className="w-8 h-px mx-1" style={{
                backgroundColor: isComplete ? 'var(--signal-amber, #FF6B35)' : 'var(--color-border)',
                opacity: isComplete ? 0.5 : 0.3,
              }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
