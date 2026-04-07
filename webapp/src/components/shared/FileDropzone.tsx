import { useState, useCallback, useId } from 'react';
import { Upload, FileText, Loader2, Eye, X } from 'lucide-react';

interface DocLike {
  id: string;
  filename: string;
  sizeBytes: number | null;
  pageCount: number | null;
}

interface FileDropzoneProps {
  documents: DocLike[];
  uploading: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
  accept?: string;
  hint?: string;
  onRemove?: (docId: string) => void;
}

export default function FileDropzone({
  documents,
  uploading,
  onFiles,
  accept = '.pdf,.docx,.doc,.txt,.png,.jpg,.jpeg',
  hint = 'Expert reports, depositions, photos',
  onRemove,
}: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputId = useId();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      onFiles(Array.from(e.dataTransfer.files));
    }
  }, [onFiles]);

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-border-accent)]'
        }`}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <input
          id={inputId}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); }}
        />
        <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-muted)]'}`} />
        <p className="text-sm text-[var(--color-text-secondary)]">Drop files here or click to browse</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">{hint}</p>
        {uploading && <Loader2 className="w-5 h-5 mx-auto mt-3 text-[var(--color-accent-primary)] animate-spin" />}
      </div>

      {documents.length > 0 && (
        <div className="mt-4 space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between py-2.5 px-4 bg-[var(--color-bg-elevated)] rounded-xl group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-[var(--color-stage-intake)] shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-[var(--color-text-primary)] font-medium truncate block">{doc.filename}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                    {doc.pageCount ?? '?'} pages · {doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(0)}KB` : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                  <Eye size={14} />
                </button>
                {onRemove && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(doc.id); }}
                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
