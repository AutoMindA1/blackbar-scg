import { useMemo } from 'react';

interface SectionReviewProps {
  /** Raw report HTML — h2/h3 headings become navigable sections */
  html: string;
  /** Container the editor is rendered into; clicking a section scrolls it. */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

interface DerivedSection {
  level: number;
  title: string;
  anchor: string;
}

function deriveSections(html: string): DerivedSection[] {
  if (typeof window === 'undefined' || !html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const headings = doc.querySelectorAll('h2, h3');
  const out: DerivedSection[] = [];
  headings.forEach((h, i) => {
    const title = (h.textContent || '').trim();
    if (!title) return;
    out.push({
      level: h.tagName === 'H2' ? 2 : 3,
      title,
      anchor: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}-${i}`,
    });
  });
  return out;
}

export default function SectionReview({ html, scrollContainerRef }: SectionReviewProps) {
  const sections = useMemo(() => deriveSections(html), [html]);

  const handleClick = (title: string) => {
    const root = scrollContainerRef?.current;
    if (!root) return;
    // Find the heading inside the editor by text content match
    const headings = Array.from(root.querySelectorAll('h2, h3')) as HTMLElement[];
    const target = headings.find((h) => (h.textContent || '').trim() === title);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (sections.length === 0) {
    return (
      <p className="text-[10px] text-[var(--color-text-muted)] px-2">
        No sections detected yet. Headings appear here as the draft is built.
      </p>
    );
  }

  return (
    <nav className="space-y-1">
      {sections.map((s, i) => (
        <button
          key={`${s.anchor}-${i}`}
          onClick={() => handleClick(s.title)}
          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] ${
            s.level === 3 ? 'pl-6 text-[11px]' : ''
          }`}
        >
          {s.title}
        </button>
      ))}
    </nav>
  );
}
