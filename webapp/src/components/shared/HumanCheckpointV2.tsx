import { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BearMark from './BearMark';

interface Finding {
  id: string;
  message: string;
  confidence?: number;
  attackPattern?: string;
}

interface HumanCheckpointV2Props {
  stage: string;
  summary: string;
  findings?: Finding[];
  qaScore?: number;
  documentCount?: number;
  onApprove: () => void;
  onRevise: (notes: string) => void;
  onReject: () => void;
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 85 ? 'var(--color-success)' : score >= 70 ? 'var(--color-warning)' : 'var(--color-error)';
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-28 h-28 mx-auto mb-4">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--color-border)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r="44" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">/ 100</span>
      </div>
    </div>
  );
}

export default function HumanCheckpointV2({
  stage,
  summary,
  findings,
  qaScore,
  documentCount,
  onApprove,
  onRevise,
  onReject,
}: HumanCheckpointV2Props) {
  const [mode, setMode] = useState<'actions' | 'revise'>('actions');
  const [notes, setNotes] = useState('');
  const [approving, setApproving] = useState(false);

  const handleApprove = () => {
    setApproving(true);
    setTimeout(() => {
      onApprove();
      setApproving(false);
    }, 600);
  };

  const handleRevise = () => {
    if (notes.trim()) {
      onRevise(notes.trim());
      setNotes('');
      setMode('actions');
    }
  };

  const stageLabel = stage.charAt(0).toUpperCase() + stage.slice(1);
  const findingCount = findings?.length ?? 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMode('actions')}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="v2-surface-elevated relative w-full max-w-2xl rounded-2xl overflow-hidden"
        >
          <BearMark variant={approving ? 'glow' : 'watermark'} opacity={approving ? 0.08 : 0.05} />

          <div className="relative z-10 p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                {stageLabel} Complete
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mt-2">{summary}</p>
            </div>

            {/* Command-center stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div
                className="rounded-xl p-3 text-center"
                style={{ background: 'var(--noir-1)', border: '1px solid var(--noir-3)' }}
              >
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{findingCount}</p>
                <p className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Findings</p>
              </div>
              <div
                className="rounded-xl p-3 text-center"
                style={{ background: 'var(--noir-1)', border: '1px solid var(--noir-3)' }}
              >
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{documentCount ?? 0}</p>
                <p className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Documents</p>
              </div>
              <div
                className="rounded-xl p-3 text-center"
                style={{ background: 'var(--noir-1)', border: '1px solid var(--noir-3)' }}
              >
                <p className="text-2xl font-bold" style={{ color: qaScore !== undefined ? (qaScore >= 85 ? 'var(--color-success)' : qaScore >= 70 ? 'var(--color-warning)' : 'var(--color-error)') : 'var(--color-text-muted)' }}>
                  {qaScore ?? '—'}
                </p>
                <p className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider mt-1">QA Score</p>
              </div>
            </div>

            {/* QA gauge when score present */}
            {qaScore !== undefined && <ScoreGauge score={qaScore} />}

            {/* Findings list */}
            {findings && findings.length > 0 && (
              <div className="mb-6 space-y-2 max-h-48 overflow-y-auto">
                {findings.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl border"
                    style={{
                      background: 'var(--signal-amber-soft)',
                      borderColor: 'var(--signal-amber-border)',
                      borderLeft: '2px solid var(--signal-amber)',
                    }}
                  >
                    {f.attackPattern && (
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'var(--signal-amber-soft)', color: 'var(--signal-amber)' }}>
                        {f.attackPattern}
                      </span>
                    )}
                    <span className="text-sm text-[var(--color-text-secondary)] flex-1">{f.message}</span>
                    {f.confidence !== undefined && (
                      <span className="shrink-0 text-xs font-mono text-[var(--color-info)]">
                        {Math.round(f.confidence * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {mode === 'actions' ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="v2-btn v2-btn-primary flex-1 flex items-center justify-center gap-2 py-3.5 font-semibold rounded-xl transition-all disabled:opacity-60"
                >
                  <Check size={18} />
                  {approving ? 'Approving...' : 'Approve & Continue'}
                </button>
                <button
                  onClick={() => setMode('revise')}
                  className="v2-btn v2-btn-ghost flex items-center justify-center gap-2 px-5 py-3.5 font-medium rounded-xl transition-all"
                >
                  <RotateCcw size={16} />
                  Revise
                </button>
                <button
                  onClick={onReject}
                  aria-label="Dismiss checkpoint"
                  className="flex items-center justify-center px-4 py-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-error)] rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What should the agent do differently?"
                  className="w-full h-24 px-4 py-3 rounded-xl text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none resize-none"
                  style={{ background: 'var(--noir-1)', border: '1px solid var(--noir-3)' }}
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleRevise}
                    disabled={!notes.trim()}
                    className="v2-btn v2-btn-primary flex-1 py-3 font-semibold rounded-xl transition-colors disabled:opacity-40"
                  >
                    Submit Revision
                  </button>
                  <button
                    onClick={() => setMode('actions')}
                    className="v2-btn v2-btn-ghost px-5 py-3 font-medium rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
