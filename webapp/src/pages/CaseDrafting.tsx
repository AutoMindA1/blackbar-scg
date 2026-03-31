import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileEdit, CheckCircle, RotateCcw } from 'lucide-react';
import Header from '../components/layout/Header';
import StageNav from '../components/shared/StageNav';
import AgentActivityFeed from '../components/shared/AgentActivityFeed';
import HumanCheckpoint from '../components/shared/HumanCheckpoint';
import { useCaseStore } from '../stores/caseStore';
import { useAgentStore } from '../stores/agentStore';
import { api } from '../lib/api';

const SECTIONS = [
  'Qualifications', 'Documentation Reviewed', 'Date & Location of Alleged Accident',
  'Alleged Accident Details', 'Points of Opinion', 'Conclusion',
];

const DEFAULT_CONTENT = `<h2>Qualifications</h2>
<p>Lane Swainston is a Certified Building Official (CBO) with the International Code Council (ICC), a position he has held since 1987. He holds additional certifications as a Certified XL Tribometrist (CXLT) through Excel Tribometers, LLC, and as a Walkway Safety Auditor (ASTM F2948-13) through the University of North Texas, one of the few programs in the country that uses an objective, measured curriculum to evaluate walkway safety skills.</p>

<p>Mariz Arellano is a Certified XL Tribometrist (CXLT) through Excel Tribometers, LLC, and holds a degree in Hotel Administration from the University of Nevada, Las Vegas.</p>

<h2>Documentation Reviewed</h2>
<p>The following documents were provided by your office or research reviewed by SCG in preparation for this Report:</p>
<ul>
<li>Plaintiff Expert Report written by John Peterson of Retail Litigation Consultants;</li>
<li>Plaintiff Deposition Transcript;</li>
<li>SCG Site Visit Photos &amp; Videos.</li>
</ul>

<h2>Date &amp; Location of Alleged Accident</h2>
<p>The Plaintiff allegedly slipped and fell at the subject premises in Clark County, Nevada.</p>

<h2>Alleged Accident Details</h2>
<p>SCG Personnel visited the subject premises to observe and document the current conditions of the subject incident area. The Plaintiff allegedly slipped and fell on the subject incident floor.</p>

<h2>Points of Opinion</h2>
<p>The opinions expressed in this section are based on our review of the available records, photographs, videos, and witness statements, as well as our analysis of the subject incident area and relevant standards.</p>

<p>The possibility of a slip occurring on a surface can be due to many factors, including the material on a pedestrian's foot, the presence and nature of surface contaminants, the pedestrian walking speed and gait, the pedestrian payment of attention, any physical or mental impairment of the individual, the level or slope of the surface, and how the surface is structured, intended to be used, and maintained. SCG considered all these factors as part of our analysis of the Plaintiff's alleged accident.</p>

<p>The BOT-3000E is a digital, automated tribometer specifically designed to measure both static and dynamic coefficient of friction on walkway surfaces in the lab and in the field. It performs tests electronically with no human input other than placing the device and pressing the start button, thereby minimizing the risk of operator manipulation. It is the only device named in ANSI A326.3, and it was validated to ASTM F2508 for use as a walkway tribometer.</p>

<h2>Conclusion</h2>
<p>SCG holds these opinions with a reasonable degree of professional certainty, based on our education and experience in quality control, design, walkway safety, venue operations, and code compliance. This Report, including any opinions contained herein, is based upon a reasonable degree of scientific probability and our investigation of the information provided. Should new details or information become available, we reserve the right to supplement our opinions as necessary.</p>

<p>Thank you for this opportunity to assist you. Please call us with any questions regarding this Report or our opinions.</p>`;

export default function CaseDrafting() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCase, fetchCase } = useCaseStore();
  const { logs, status, connectSSE, disconnectSSE, triggerAgent, clearLogs } = useAgentStore();
  const [content, setContent] = useState('');
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => { if (id) { fetchCase(id); connectSSE(id); } return () => disconnectSSE(); }, [id]);
  useEffect(() => {
    if (activeCase?.report?.content) setContent(activeCase.report.content);
    else setContent(DEFAULT_CONTENT);
  }, [activeCase]);
  useEffect(() => { if (status === 'complete') setShowCheckpoint(true); }, [status]);

  const handleRunDrafting = async () => {
    if (!id) return;
    clearLogs();
    await triggerAgent(id, 'drafting');
  };

  const handleSave = async () => {
    if (!id) return;
    await api.saveReport(id, content);
  };

  const handleApprove = async () => {
    if (!id) return;
    await handleSave();
    const { nextStage } = await api.approve(id, 'drafting', 'approve');
    setShowCheckpoint(false);
    navigate(`/cases/${id}/${nextStage}`);
  };

  if (!activeCase) return <div className="text-text-muted">Loading...</div>;
  const stageNavigate = (stage: string) => navigate(`/cases/${id}/${stage}`);

  return (
    <div>
      <Header title={activeCase.name} subtitle="Drafting — Brain queries: §5 Voice Rules, §7 Standard Blocks, §4 Report Structure, §12 Format Rules" />
      <StageNav currentStage={activeCase.stage} onNavigate={stageNavigate} />

      <div className="grid grid-cols-12 gap-6">
        {/* Section nav */}
        <div className="col-span-2 space-y-1">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">Sections</h3>
          {SECTIONS.map((s, i) => (
            <button key={s} onClick={() => setActiveSection(i)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${i === activeSection ? 'bg-accent-glow text-accent-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`}>
              {s}
            </button>
          ))}
          <div className="border-t border-border pt-3 mt-3 space-y-2">
            <button onClick={handleRunDrafting}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-accent-primary/20 text-accent-primary rounded-lg text-xs hover:bg-accent-primary/30">
              <FileEdit className="w-3 h-3" /> Run Drafting Agent
            </button>
            <button onClick={handleSave}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-surface text-text-secondary rounded-lg text-xs hover:text-text-primary">
              Save Draft
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="col-span-7">
          <div className="glass rounded-xl p-6 min-h-[600px]">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[550px] bg-transparent text-sm text-text-primary leading-relaxed resize-none focus:outline-none font-body"
              style={{ textAlign: 'justify' }}
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowCheckpoint(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-success/20 text-success py-3 rounded-lg hover:bg-success/30 transition-colors font-medium">
              <CheckCircle className="w-4 h-4" /> Approve Draft
            </button>
            <button onClick={handleRunDrafting}
              className="flex items-center gap-2 px-6 py-3 bg-surface text-text-secondary rounded-lg hover:text-text-primary text-sm">
              <RotateCcw className="w-4 h-4" /> Request Revision
            </button>
          </div>
        </div>

        {/* Activity */}
        <div className="col-span-3">
          <AgentActivityFeed logs={logs} />
        </div>
      </div>

      {showCheckpoint && (
        <HumanCheckpoint
          stage="drafting"
          summary="Draft complete — 6 sections generated. BLK-01 multi-factor opener, BLK-08 BOT-3000E block, and BLK-CL conclusion inserted. Entity voice maintained throughout."
          onApprove={handleApprove}
          onRevise={async (notes) => { clearLogs(); await triggerAgent(id!, 'drafting', notes); setShowCheckpoint(false); }}
          onReject={() => setShowCheckpoint(false)}
          onClose={() => setShowCheckpoint(false)}
        />
      )}
    </div>
  );
}
