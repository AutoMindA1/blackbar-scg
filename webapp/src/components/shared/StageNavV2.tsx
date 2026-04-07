import { Check, Scale } from 'lucide-react';

interface StageNavV2Props {
  currentStage: 'intake' | 'research' | 'drafting' | 'qa' | 'export';
  completedStages: string[];
  agentRunning?: boolean;
  onNavigate: (stage: string) => void;
}

const stages = [
  { key: 'intake', label: 'Intake', color: 'var(--color-stage-intake)' },
  { key: 'research', label: 'Research', color: 'var(--color-stage-research)' },
  { key: 'drafting', label: 'Drafting', color: 'var(--color-stage-drafting)' },
  { key: 'qa', label: 'QA', color: 'var(--color-stage-qa)' },
  { key: 'export', label: 'Export', color: 'var(--color-stage-export)' },
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
                    style={{ backgroundColor: stage.color }}
                  >
                    <Check size={12} className="text-[var(--color-bg-primary)]" strokeWidth={3} />
                  </span>
                ) : stage.key === 'qa' ? (
                  <span
                    className={`flex items-center justify-center w-5 h-5 rounded-full ${isRunning ? 'stage-pulse-ring' : ''}`}
                    style={{ color: stage.color, backgroundColor: isCurrent ? `${stage.color}22` : 'transparent' }}
                  >
                    <Scale size={12} style={{ color: stage.color }} />
                  </span>
                ) : (
                  <span
                    className={`block w-3 h-3 rounded-full border-2 ${isRunning ? 'stage-pulse-ring' : ''}`}
                    style={{
                      borderColor: stage.color,
                      backgroundColor: isCurrent ? stage.color : 'transparent',
                      color: stage.color,
                    }}
                  />
                )}
              </span>
              <span>{stage.label}</span>
            </button>

            {/* Connector line */}
            {i < stages.length - 1 && (
              <div className="w-8 h-px mx-1" style={{
                backgroundColor: isComplete ? stage.color : 'var(--color-border)',
                opacity: isComplete ? 0.6 : 0.3,
              }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
