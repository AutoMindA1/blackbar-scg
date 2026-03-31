import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Briefcase, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Header from '../components/layout/Header';
import { useCaseStore } from '../stores/caseStore';

const STAGE_COLORS: Record<string, string> = {
  intake: 'bg-accent-secondary/20 text-accent-secondary',
  research: 'bg-purple-500/20 text-purple-400',
  drafting: 'bg-accent-primary/20 text-accent-primary',
  qa: 'bg-warning/20 text-warning',
  export: 'bg-success/20 text-success',
  complete: 'bg-success/20 text-success',
};

export default function Dashboard() {
  const { cases, loading, fetchCases } = useCaseStore();
  const navigate = useNavigate();
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseType, setNewCaseType] = useState('slip_fall');
  const [newReportType, setNewReportType] = useState('initial');
  const { createCase } = useCaseStore();

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleCreateCase = async () => {
    if (!newCaseName.trim()) return;
    const c = await createCase({ name: newCaseName, caseType: newCaseType, reportType: newReportType, jurisdiction: 'Clark County, Nevada' });
    setShowNewCase(false); setNewCaseName('');
    navigate(`/cases/${c.id}/intake`);
  };

  const activeCases = cases.filter((c) => c.stage !== 'complete');
  const completedCases = cases.filter((c) => c.stage === 'complete');
  const pendingReview = cases.filter((c) => ['qa', 'export'].includes(c.stage));

  return (
    <div>
      <Header title="Dashboard" action={
        <button onClick={() => setShowNewCase(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold rounded-lg transition-colors text-sm">
          <Plus className="w-4 h-4" /> New Case
        </button>
      } />

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Cases', value: activeCases.length, icon: Briefcase, color: 'text-accent-primary' },
          { label: 'Completed', value: completedCases.length, icon: CheckCircle, color: 'text-success' },
          { label: 'Avg Turnaround', value: '2.4d', icon: Clock, color: 'text-accent-secondary' },
          { label: 'Pending Review', value: pendingReview.length, icon: AlertCircle, color: 'text-warning' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-5 glow-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted uppercase tracking-wider">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="font-display text-3xl text-text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Case List */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-secondary">All Cases</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-text-muted">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No cases yet. Create one to get started.</div>
        ) : (
          <div className="divide-y divide-border">
            {cases.map((c) => (
              <button key={c.id} onClick={() => navigate(`/cases/${c.id}/${c.stage === 'complete' ? 'export' : c.stage}`)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface/50 transition-colors text-left">
                <div className="flex-1">
                  <p className="text-sm text-text-primary font-medium">{c.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {c.jurisdiction} {c.opposingExpert ? `— ${c.opposingExpert}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted font-mono">{c.documentCount} docs</span>
                  <span className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${STAGE_COLORS[c.stage] || 'bg-surface text-text-muted'}`}>
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
          <div className="glass rounded-2xl p-6 w-full max-w-md glow-border">
            <h3 className="font-display text-lg text-text-primary mb-4">New Case</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Case Name</label>
                <input value={newCaseName} onChange={(e) => setNewCaseName(e.target.value)}
                  placeholder="[Defendant] adv [Plaintiff]"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Case Type (Brain §3)</label>
                  <select value={newCaseType} onChange={(e) => setNewCaseType(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary">
                    <option value="slip_fall">Slip & Fall</option>
                    <option value="trip_fall">Trip & Fall</option>
                    <option value="stair">Stair Incident</option>
                    <option value="walkway">Walkway Hazard</option>
                    <option value="construction">Construction Defect</option>
                    <option value="surveillance">Surveillance Analysis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Report Type (Brain §4)</label>
                  <select value={newReportType} onChange={(e) => setNewReportType(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary">
                    <option value="initial">Initial Report</option>
                    <option value="rebuttal">Rebuttal Report</option>
                    <option value="supplemental">Supplemental Report</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleCreateCase}
                  className="flex-1 bg-accent-primary hover:bg-accent-primary/90 text-white py-2.5 rounded-lg font-medium text-sm">
                  Create Case
                </button>
                <button onClick={() => setShowNewCase(false)}
                  className="px-4 py-2.5 bg-surface text-text-muted rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
