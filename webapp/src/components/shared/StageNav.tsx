import { Check, Circle, Loader2 } from 'lucide-react';

const STAGES = ['intake', 'research', 'drafting', 'qa', 'export'] as const;
const STAGE_LABELS: Record<string, string> = {
  intake: 'Intake', research: 'Research', drafting: 'Drafting', qa: 'QA', export: 'Export',
};

interface Props { currentStage: string; onNavigate?: (stage: string) => void; }

export default function StageNav({ currentStage, onNavigate }: Props) {
  const currentIdx = STAGES.indexOf(currentStage as typeof STAGES[number]);

  return (
    <div className="flex items-center gap-1 mb-6 p-1 bg-surface rounded-xl">
      {STAGES.map((stage, i) => {
        const isComplete = i < currentIdx;
        const isCurrent = stage === currentStage;
        const isFuture = i > currentIdx;

        return (
          <button
            key={stage}
            onClick={() => onNavigate?.(stage)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center
              ${isCurrent ? 'bg-accent-glow text-accent-primary border border-accent-primary/30' : ''}
              ${isComplete ? 'text-success hover:bg-surface' : ''}
              ${isFuture ? 'text-text-muted' : ''}
            `}
          >
            {isComplete && <Check className="w-4 h-4" />}
            {isCurrent && <Loader2 className="w-4 h-4 animate-spin" />}
            {isFuture && <Circle className="w-3 h-3" />}
            {STAGE_LABELS[stage]}
          </button>
        );
      })}
    </div>
  );
}
