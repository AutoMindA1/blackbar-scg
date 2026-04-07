import BearMark from './BearMark';

interface SkeletonLoaderProps {
  type: 'card' | 'list' | 'text' | 'stat';
  count?: number;
}

function SkeletonBlock({ type }: { type: SkeletonLoaderProps['type'] }) {
  if (type === 'stat') {
    return (
      <div className="glass p-6 rounded-2xl">
        <div className="skeleton h-3 w-20 mb-3" />
        <div className="skeleton h-8 w-16 mb-2" />
        <div className="skeleton h-2 w-24" />
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="glass p-6 rounded-2xl">
        <div className="skeleton h-4 w-3/4 mb-3" />
        <div className="skeleton h-3 w-1/2 mb-2" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="flex items-center gap-3 py-3 px-4">
        <div className="skeleton w-8 h-8 rounded-full shrink-0" />
        <div className="flex-1">
          <div className="skeleton h-3 w-3/4 mb-2" />
          <div className="skeleton h-2 w-1/2" />
        </div>
      </div>
    );
  }

  // text
  return (
    <div className="space-y-2">
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-5/6" />
      <div className="skeleton h-3 w-3/4" />
    </div>
  );
}

export default function SkeletonLoader({ type, count = 1 }: SkeletonLoaderProps) {
  return (
    <div className="relative">
      <BearMark variant="pulse" opacity={0.04} />
      <div className="relative z-10 space-y-4">
        {Array.from({ length: count }, (_, i) => (
          <SkeletonBlock key={i} type={type} />
        ))}
      </div>
    </div>
  );
}
