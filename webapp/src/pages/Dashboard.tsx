import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Briefcase, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useCaseStore } from '../stores/caseStore';
import { useAuthStore } from '../stores/authStore';
import BearMark from '../components/shared/BearMark';
import EmptyState from '../components/shared/EmptyState';
import SkeletonLoader from '../components/shared/SkeletonLoader';

const STAGE_COLORS: Record<string, string> = {
  intake: 'bg-[var(--color-stage-intake)]/20 text-[var(--color-stage-intake)]',
  research: 'bg-[var(--color-stage-research)]/20 text-[var(--color-stage-research)]',
  drafting: 'bg-[var(--color-stage-drafting)]/20 text-[var(--color-stage-drafting)]',
  qa: 'bg-[var(--color-stage-qa)]/20 text-[var(--color-stage-qa)]',
  export: 'bg-[var(--color-stage-export)]/20 text-[var(--color-stage-export)]',
  complete: 'bg-[var(--color-success)]/20 text-[var(--color-success)]',
};

export default function Dashboard() {
  const { cases, loading, error, fetchCases, createCase } = useCaseStore();
  const user = useAuthStore((s) => s.user);
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
    setCreateError(''); setCreating(true);
    try {
      const c = await createCase({ name: newCaseName, caseType: newCaseType, reportType: newReportType, jurisdiction: 'Clark County, Nevada' });
      setShowNewCase(false); setNewCaseName('');
      navigate(`/cases/${c.id}/intake`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create case');
    } finally { setCreating(false); }
  };

  const activeCases = cases.filter((c) => c.stage !== 'complete');
  const completedCases = cases.filter((c) => c.stage === 'complete');
  const pendingReview = cases.filter((c) => ['qa', 'export'].includes(c.stage));

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="page-enter">
      {/* Hero header with bear crop */}
      <div className="relative overflow-hidden rounded-2xl mb-8 h-48">
        <BearMark variant="hero" size="full" className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-primary)] via-[var(--color-bg-primary)]/80 to-transparent" />
        <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[var(--color-text-primary)]">
              {greeting}, {user?.name?.split(' ')[0] || 'Lane'}.
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{dateStr}</p>
          </div>
          <button onClick={() => setShowNewCase(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] text-white font-semibold rounded-xl transition-colors text-sm">
            <Plus className="w-4 h-4" /> New Case
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Cases', value: activeCases.length, icon: Briefcase, color: 'var(--color-accent-primary)' },
          { label: 'Completed', value: completedCases.length, icon: CheckCircle, color: 'var(--color-success)' },
          { label: 'Avg Turnaround', value: '2.4d', icon: Clock, color: 'var(--color-accent-secondary)' },
          { label: 'Pending Review', value: pendingReview.length, icon: AlertCircle, color: 'var(--color-warning)' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-5 card-hover relative overflow-hidden">
            <BearMark variant="watermark" opacity={0.02} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">{stat.label}</span>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <p className="text-3xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Case List */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">All Cases</h3>
        </div>
        {loading ? (
          <div className="p-6"><SkeletonLoader type="list" count={3} /></div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-[var(--color-error)] text-sm mb-2">Failed to load cases</p>
            <p className="text-[var(--color-text-muted)] text-xs mb-3">{error}</p>
            <button onClick={() => fetchCases()} className="text-xs text-[var(--color-accent-primary)] hover:underline">Retry</button>
          </div>
        ) : cases.length === 0 ? (
          <EmptyState
            title="No cases yet"
            description="Create your first case to get started with AI-assisted report drafting."
            actionLabel="New Case"
            onAction={() => setShowNewCase(true)}
          />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {cases.map((c) => (
              <button key={c.id} onClick={() => navigate(`/cases/${c.id}/${c.stage === 'complete' ? 'export' : c.stage}`)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--color-bg-elevated)] transition-colors text-left">
                <div className="flex-1">
                  <p className="text-sm text-[var(--color-text-primary)] font-medium">{c.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {c.jurisdiction} {c.opposingExpert ? `\u2014 ${c.opposingExpert}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-text-muted)] font-mono">{c.documentCount} docs</span>
                  <span className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${STAGE_COLORS[c.stage] || 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'}`}>
                    {c.stage}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Case Modal */}
      {showNewCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-elevated rounded-2xl p-6 w-full max-w-md page-enter relative overflow-hidden">
            <BearMark variant="watermark" opacity={0.04} />
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">New Case</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Case Name</label>
                  <input value={newCaseName} onChange={(e) => setNewCaseName(e.target.value)}
                    placeholder="[Defendant] adv [Plaintiff]"
                    className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                    autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Case Type</label>
                    <select value={newCaseType} onChange={(e) => setNewCaseType(e.target.value)}
                      className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-primary)]">
                      <option value="slip_fall">Slip & Fall</option>
                      <option value="trip_fall">Trip & Fall</option>
                      <option value="stair">Stair Incident</option>
                      <option value="walkway">Walkway Hazard</option>
                      <option value="construction">Construction Defect</option>
                      <option value="surveillance">Surveillance Analysis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Report Type</label>
                    <select value={newReportType} onChange={(e) => setNewReportType(e.target.value)}
                      className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-primary)]">
                      <option value="initial">Initial Report</option>
                      <option value="rebuttal">Rebuttal Report</option>
                      <option value="supplemental">Supplemental Report</option>
                    </select>
                  </div>
                </div>
                {createError && <p className="text-[var(--color-error)] text-xs">{createError}</p>}
                <div className="flex gap-2 pt-2">
                  <button onClick={handleCreateCase} disabled={creating || !newCaseName.trim()}
                    className="flex-1 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-semibold text-sm transition-colors">
                    {creating ? 'Creating...' : 'Create Case'}
                  </button>
                  <button onClick={() => setShowNewCase(false)}
                    className="px-4 py-2.5 bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] rounded-xl text-sm border border-[var(--color-border)]">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
