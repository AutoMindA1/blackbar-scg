import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageDoc {
  id: string;
  filename: string;
  filepath: string;
  extractedText?: string | null;
}

interface ImagePreviewModalProps {
  images: ImageDoc[];
  initialIndex: number;
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

function imageUrl(filepath: string): string {
  const basename = filepath.split('/').pop() ?? filepath;
  return `/uploads/${basename}`;
}

export default function ImagePreviewModal({
  images,
  currentIndex,
  onNavigate,
  onClose,
}: ImagePreviewModalProps) {
  const image = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1);
    },
    [onClose, onNavigate, currentIndex, hasPrev, hasNext],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11,13,16,0.92)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-[24px] overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          animation: 'var(--motion-fade-in)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Image preview: ${image.filename}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3 min-w-0">
            {!image.extractedText && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono tracking-wider shrink-0"
                style={{
                  backgroundColor: 'rgba(217,164,65,0.14)',
                  color: 'var(--verdict-amber, #D9A441)',
                  border: '1px solid rgba(217,164,65,0.3)',
                }}
              >
                AGENT BLIND
              </span>
            )}
            <span className="text-xs text-[var(--color-text-muted)] truncate">
              {image.extractedText
                ? 'Text extracted via OCR — agent reasoning is active'
                : 'Run Intake agent to extract image content'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 ml-3 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
            aria-label="Close preview"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body: image + text rail */}
        <div className="flex flex-col lg:flex-row">

          {/* Image pane */}
          <div className="relative flex items-center justify-center bg-[var(--color-bg-primary)] min-h-[320px] max-h-[60vh] overflow-hidden flex-1">
            <img
              key={image.id}
              src={imageUrl(image.filepath)}
              alt={image.filename}
              className="max-w-full max-h-full object-contain"
              style={{ display: 'block' }}
            />
            {hasPrev && (
              <button
                onClick={() => onNavigate(currentIndex - 1)}
                className="absolute left-3 p-2 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                aria-label="Previous image"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {hasNext && (
              <button
                onClick={() => onNavigate(currentIndex + 1)}
                className="absolute right-3 p-2 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                aria-label="Next image"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>

          {/* Extracted text rail */}
          <div
            className="lg:w-72 border-t lg:border-t-0 lg:border-l border-[var(--color-border)] p-4 overflow-y-auto max-h-[60vh]"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <p className="text-[10px] font-mono tracking-wider text-[var(--color-text-muted)] mb-2 uppercase">
              Extracted text
            </p>
            {image.extractedText ? (
              <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed font-mono">
                {image.extractedText}
              </p>
            ) : (
              <div className="space-y-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono tracking-wider"
                  style={{
                    backgroundColor: 'rgba(217,164,65,0.14)',
                    color: 'var(--verdict-amber, #D9A441)',
                    border: '1px solid rgba(217,164,65,0.3)',
                  }}
                >
                  AGENT BLIND
                </span>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Run the Intake agent to extract text from this image.
                </p>
              </div>
            )}
          </div>

        </div>{/* end body */}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-text-muted)] font-mono truncate">{image.filename}</span>
          {images.length > 1 && (
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono shrink-0 ml-4">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
