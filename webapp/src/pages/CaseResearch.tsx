import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, BookOpen, Shield, CheckCircle } from 'lucide-react';
import Header from '../components/layout/Header';
import StageNav from '../components/shared/StageNav';
import AgentActivityFeed from '../components/shared/AgentActivityFeed';
import HumanCheckpoint from '../components/shared/HumanCheckpoint';
import { useCaseStore } from '../stores/caseStore';
import { useAgentStore } from '../stores/agentStore';
import { api } from '../lib/api';

// Mock findings seeded from the Brain's attack patterns
const MOCK_FINDINGS = [
  {
    id: 1,
    claim: '"The floor surface was inherently dangerous and failed to meet NFSI standards."',
    codeRef: 'ANSI A326.3 / NFSI B101.1 / B101.3',
    reasoning: 'ATK-08: Instrumentation defense — BOT-3000E is the only device named in ANSI A326.3. Plaintiff Expert used no instrument. Brain §8 confirms multi-standard framework applies.',
    source: 'Peterson Expert Report, p.8',
    pattern: 'ATK-08',
  },
  {
    id: 2,
    claim: '"The defendant failed to maintain adequate slip resistance testing programs."',
    codeRef: 'CXLT Registry — Excel Tribometers, LLC',
    reasoning: 'ATK-01: Credential attack — Peterson CXLT certification EXPIRED per public registry. Cannot credibly opine on tribometer methodology without active certification. Brain §10.',
    source: 'CXLT Registry, checked 15 March 2026',
    pattern: 'ATK-01',
  },
  {
    id: 3,
    claim: '"Based on my review of the photographs and records, the surface was unsafe."',
    codeRef: 'BLK-11: No site visit dismissal',
    reasoning: 'ATK-07: Omission attack — Peterson never visited the subject property, never tested the floor, never examined footwear, never analyzed gait from video. Brain §6 omission sequence applies.',
    source: 'Peterson Report — no site inspection documented',
    pattern: 'ATK-07',
  },
  {
    id: 4,
    claim: '"The 1988 Uniform Building Code required compliant flooring surfaces."',
    codeRef: '1988 UBC — Clark County adopted edition',
    reasoning: 'ATK-02: Code edition-in-force — 1991 construction date → 1988 UBC applies per Clark County adoption. Plaintiff cited IBC 2021 which was not adopted at permit date. Brain §8 5-step methodology.',
    source: 'Clark County Building Dept records',
    pattern: 'ATK-02',
  },
];

export default function CaseResearch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCase, fetchCase } = useCaseStore();
  const { logs, status, connectSSE, disconnectSSE, triggerAgent, clearLogs } = useAgentStore();
  const [showCheckpoint, setShowCheckpoint] = useState(false);

  useEffect(() => { if (id) { fetchCase(id); connectSSE(id); } return () => disconnectSSE(); }, [id, fetchCase, connectSSE, disconnectSSE]);
  useEffect(() => { if (status === 'complete') setShowCheckpoint(true); }, [status]);

  const handleRunResearch = async () => {
    if (!id) return;
    clearLogs();
    await triggerAgent(id, 'research');
  };

  const handleApprove = async () => {
    if (!id) return;
    const { nextStage } = await api.approve(id, 'research', 'approve');
    setShowCheckpoint(false);
    navigate(`/cases/${id}/${nextStage}`);
  };

  const { error } = useCaseStore();
  if (error) return <div className="p-8 text-center"><p className="text-error text-sm mb-2">Failed to load case</p><p className="text-text-muted text-xs">{error}</p></div>;
  if (!activeCase) return <div className="p-8 text-center text-text-muted">Loading...</div>;

  const stageNavigate = (stage: string) => navigate(`/cases/${id}/${stage}`);

  return (
    <div>
      <Header title={activeCase.name} subtitle="Research — Brain queries: §6 Attack Patterns, §8 Standards & Codes, §10 Known Adversary, §9 Instruments" />
      <StageNav currentStage={activeCase.stage} onNavigate={stageNavigate} agentRunning={status === 'running'} />

      <div className="grid grid-cols-3 gap-6">
        {/* Research summary + findings */}
        <div className="col-span-2 space-y-4">
          {/* Summary */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                <Search className="w-4 h-4" /> Research Findings
              </h3>
              <div className="flex items-center gap-3 text-xs text-text-muted font-mono">
                <span>{MOCK_FINDINGS.length} findings</span>
                <span>12 citations</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={handleRunResearch}
                disabled={status === 'running'}
                className="px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg text-sm hover:bg-accent-primary/30 disabled:opacity-50 transition-colors">
                {status === 'running' ? 'Running...' : 'Run Research Agent'}
              </button>
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/20 text-warning">Sample Data</span>
            </div>
          </div>

          {/* Citation cards */}
          <div className="grid grid-cols-2 gap-4">
            {MOCK_FINDINGS.map((f) => (
              <div key={f.id} className="glass rounded-xl p-5 space-y-3 glow-border">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary">
                    {f.pattern}
                  </span>
                  <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                </div>
                <blockquote className="text-xs text-text-secondary italic border-l-2 border-accent-primary/30 pl-3">
                  {f.claim}
                </blockquote>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Code / Standard</p>
                  <p className="text-xs text-accent-secondary font-mono">{f.codeRef}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Agent Reasoning</p>
                  <p className="text-xs text-text-primary leading-relaxed">{f.reasoning}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-text-muted" />
                  <span className="text-[10px] text-text-muted">{f.source}</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => setShowCheckpoint(true)}
            className="w-full flex items-center justify-center gap-2 bg-success/20 text-success py-3 rounded-lg hover:bg-success/30 transition-colors font-medium">
            <CheckCircle className="w-4 h-4" /> Approve Research
          </button>
        </div>

        {/* Right — Activity */}
        <AgentActivityFeed logs={logs} />
      </div>

      {showCheckpoint && (
        <HumanCheckpoint
          stage="research"
          summary={`Research complete — ${MOCK_FINDINGS.length} attack patterns identified, 12 citations catalogued. Peterson CXLT expired. Omission attack at maximum strength.`}
          onApprove={handleApprove}
          onRevise={async (notes) => { clearLogs(); await triggerAgent(id!, 'research', notes); setShowCheckpoint(false); }}
          onReject={() => setShowCheckpoint(false)}
          onClose={() => setShowCheckpoint(false)}
        />
      )}
    </div>
  );
}
