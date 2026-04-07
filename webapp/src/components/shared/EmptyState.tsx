import type { LucideIcon } from 'lucide-react';
import BearMark from './BearMark';

interface EmptyStateProps {
  icon?: LucideIcon;
  useBear?: boolean;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  useBear = true,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center py-16 px-8 text-center">
      {useBear && <BearMark variant="watermark" opacity={0.06} />}
      <div className="relative z-10">
        {Icon && (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-elevated)]">
            <Icon size={28} className="text-[var(--color-text-muted)]" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-6">{description}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="px-6 py-3 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] text-white font-semibold rounded-xl transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
