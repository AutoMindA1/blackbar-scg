import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useCaseStore } from '../stores/caseStore';
import EmptyState from '../components/shared/EmptyState';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import type { CaseSummary } from '../lib/api';

/**
 * Dashboard — UI_REFERENCE_v1.html §04. Dense table, not a card grid; one
 * amber CTA only ("+ New case"); stage pill tells Lane where each case is
 * without a click-in. Hover reveals the row.
 *
 * §04 explicitly omits the v1 hero+bear header and the 4-stat row; both
 * removed in this migration. The greeting / "good morning, Lane" line is
 * also gone — Lane sees the dense table on entry.
 */

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 1) return 'updated just now';
  if (m < 60) return `updated ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `updated ${h}h ago`;
  if (h < 48) return 'updated yesterday';
  const d = Math.floor(h / 24);
  return `updated ${d}d ago`;
}

interface PillSpec {
  className: string;
  label: string;
  pulsingDot: boolean;
}

function stagePill(stage: string): PillSpec {
  if (stage === 'complete') return { className: 'v2-pill v2-pill-complete', label: 'Complete', pulsingDot: false };
  if (stage === 'intake') return { className: 'v2-pill v2-pill-pending', label: 'Intake', pulsingDot: false };
  const labels: Record<string, string> = {
    research: 'Research',
    drafting: 'Drafting',
    qa: 'QA',
    export: 'Export',
  };
  return { className: 'v2-pill v2-pill-running', label: labels[stage] ?? stage, pulsingDot: true };
}

function summarizeRow(c: CaseSummary): string {
  const parts: string[] = [];
  if (c.caseType) parts.push(c.caseType.replace(/_/g, ' '));
  if (c.reportType) parts.push(`${c.reportType} report`);
  parts.push(`${c.documentCount} document${c.documentCount === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display-v2)',
  fontWeight: 500,
  fontSize: '1.0625rem',
  letterSpacing: '-0.015em',
  fontVariationSettings: '"opsz" 60',
  color: 'var(--bone)',
};

const subStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--bone-muted)',
  marginTop: '3px',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--noir-0)',
  border: '1px solid var(--noir-3)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 14px',
  color: 'var(--bone)',
  fontFamily: 'var(--font-ui-v2)',
  fontSize: '0.9375rem',
  width: '100%',
};

export default function Dashboard() {
  const { cases, loading, error, fetchCases, createCase } = useCaseStore();
  const navigate = useNavigate();
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseType, setNewCaseType] = useState('slip_fall');
  const [newReportType, setNewReportType] = useState('initial');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  useEffect(() => {
    if (!showNewCase) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowNewCase(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showNewCase]);

  const handleCreateCase = async () => {
    if (!newCaseName.trim()) return;
    setCreateError('');
    setCreating(true);
    try {
      const c = await createCase({
        name: newCaseName,
        caseType: newCaseType,
        reportType: newReportType,
        jurisdiction: 'Clark County, Nevada',
      });
      setShowNewCase(false);
      setNewCaseName('');
      navigate(`/cases/${c.id}/intake`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create case');
    } finally {
      setCreating(false);
    }
  };

  const activeCount = cases.filter((c) => c.stage !== 'complete').length;

  return (
    <div className="page-enter">
      {/* §04 header — "Active matters · N" + sort meta + the only amber CTA */}
      <header className="flex items-baseline justify-between mb-6">
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display-v2)',
              fontWeight: 500,
              fontSize: '1.75rem',
              letterSpacing: '-0.02em',
              fontVariationSettings: '"opsz" 80',
              color: 'var(--bone)',
              margin: 0,
            }}
          >
            Active matters · {activeCount}
          </h1>
          <p className="v2-micro" style={{ color: 'var(--bone-muted)', marginTop: '4px' }}>
            Sorted by last activity
          </p>
        </div>
        <button onClick={() => setShowNewCase(true)} className="v2-btn v2-btn-primary">
          + New case
        </button>
      </header>

      {/* Body: skeleton / error / empty / dense list */}
      {loading ? (
        <div className="v2-surface" style={{ padding: '8px' }}>
          <SkeletonLoader type="list" count={3} />
        </div>
      ) : error ? (
        <div className="v2-surface" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--verdict-red)', fontSize: '0.9375rem', marginBottom: '8px' }}>
            Failed to load cases
          </p>
          <p style={{ color: 'var(--bone-muted)', fontSize: '0.8125rem', marginBottom: '16px' }}>
            {error}
          </p>
          <button onClick={() => fetchCases()} className="v2-btn v2-btn-ghost">Retry</button>
        </div>
      ) : cases.length === 0 ? (
        <div className="v2-surface">
          <EmptyState
            title="Every case starts with one PDF."
            description="No matters yet. Create the first one and the Intake agent picks it up the moment you drop a file."
            actionLabel="Start your first case"
            onAction={() => setShowNewCase(true)}
          />
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            background: 'var(--noir-3)',
            border: '1px solid var(--noir-3)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          {cases.map((c) => {
            const pill = stagePill(c.stage);
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}/${c.stage === 'complete' ? 'export' : c.stage}`)}
                className="v2-focus-ring"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  gap: '32px',
                  alignItems: 'center',
                  background: 'var(--noir-1)',
                  padding: '20px 24px',
                  border: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--bone)',
                  transition: 'background var(--duration-base) var(--ease-forensic)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--noir-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--noir-1)'; }}
              >
                <div>
                  <div style={titleStyle}>{c.name}</div>
                  <div style={subStyle}>{summarizeRow(c)}</div>
                </div>
                <span className={pill.className}>
                  {pill.pulsingDot && (
                    <span
                      className="animate-pulse"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'currentColor',
                      }}
                      aria-hidden
                    />
                  )}
                  {pill.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono-v2)',
                    fontSize: '0.75rem',
                    color: 'var(--bone-dim)',
                  }}
                >
                  {relativeTime(c.lastActivity)}
                </span>
                <ChevronRight size={18} style={{ color: 'var(--bone-dim)' }} />
              </button>
            );
          })}
        </div>
      )}

      {/* New case modal — restyled to v2-surface-elevated */}
      {showNewCase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewCase(false); }}
        >
          <div
            className="v2-surface-elevated page-enter"
            style={{ padding: '32px', width: '100%', maxWidth: '440px' }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-display-v2)',
                fontWeight: 500,
                fontSize: '1.5rem',
                letterSpacing: '-0.015em',
                fontVariationSettings: '"opsz" 80',
                color: 'var(--bone)',
                marginBottom: '24px',
              }}
            >
              New case
            </h3>
            <div className="space-y-4">
              <div>
                <label className="v2-micro" style={{ display: 'block', marginBottom: '8px', color: 'var(--bone-muted)' }}>
                  Case name
                </label>
                <input
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  placeholder="[Defendant] adv [Plaintiff]"
                  style={inputStyle}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="v2-micro" style={{ display: 'block', marginBottom: '8px', color: 'var(--bone-muted)' }}>
                    Matter type
                  </label>
                  <select
                    value={newCaseType}
                    onChange={(e) => setNewCaseType(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="slip_fall">Slip & fall</option>
                    <option value="trip_fall">Trip & fall</option>
                    <option value="stair">Stair incident</option>
                    <option value="walkway">Walkway hazard</option>
                    <option value="construction">Construction defect</option>
                    <option value="surveillance">Surveillance analysis</option>
                  </select>
                </div>
                <div>
                  <label className="v2-micro" style={{ display: 'block', marginBottom: '8px', color: 'var(--bone-muted)' }}>
                    Report type
                  </label>
                  <select
                    value={newReportType}
                    onChange={(e) => setNewReportType(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="initial">Initial</option>
                    <option value="rebuttal">Rebuttal</option>
                    <option value="supplemental">Supplemental</option>
                  </select>
                </div>
              </div>
              {createError && (
                <p style={{ color: 'var(--verdict-red)', fontSize: '0.75rem' }}>{createError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreateCase}
                  disabled={creating || !newCaseName.trim()}
                  className="v2-btn v2-btn-primary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    opacity: (creating || !newCaseName.trim()) ? 0.5 : 1,
                    cursor: (creating || !newCaseName.trim()) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creating ? 'Creating…' : 'Create case'}
                </button>
                <button onClick={() => setShowNewCase(false)} className="v2-btn v2-btn-ghost">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
