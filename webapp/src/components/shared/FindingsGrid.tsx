import CitationCard from './CitationCard';
import type { Citation } from './CitationCard';
import BearMark from './BearMark';

interface FindingsGridProps {
  citations: Citation[];
}

export default function FindingsGrid({ citations }: FindingsGridProps) {
  if (citations.length === 0) return null;

  return (
    <div className="relative">
      <BearMark variant="watermark" opacity={0.03} />
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {citations.map((c) => (
          <CitationCard key={c.id} citation={c} />
        ))}
      </div>
    </div>
  );
}
