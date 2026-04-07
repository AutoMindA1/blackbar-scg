# BlackBar v2.0 — Lemonade-Style Enterprise UI Specification
## "Savage Wins" Design System + Screen-by-Screen Implementation Spec
## For Claude Code Execution | Target: Monday Demo with Lane & Mariz

---

## DESIGN PHILOSOPHY

**Inspiration:** Lemonade Insurance — conversational, progressive disclosure, one-action-at-a-time, glossy animations, approachable enterprise.

**BlackBar Translation:** Forensic noir meets modern enterprise. Dark canvas (not black — deep charcoal), brass/orange accent (#FF6B35), glass morphism panels, purposeful micro-animations. The UI should feel like a premium legal tool that Lane and Mariz can operate without training.

**Core Principles:**
1. **One primary action per screen.** Never present 3 equal buttons — one is always dominant.
2. **Progressive disclosure.** Show context as needed, collapse when not.
3. **Conversational guidance.** Empty states tell users exactly what to do. Transitions explain what just happened and what's next.
4. **Live feedback everywhere.** Every click produces immediate visual response. No silent waits.
5. **Print-grade typography.** Reports render in Times New Roman with justified text — same as the final PDF. Everything else is clean sans-serif.

---

## DESIGN TOKENS

### Colors

```css
:root {
  /* Surfaces */
  --bg-primary: #0A0A0F;          /* Deep charcoal — not pure black */
  --bg-secondary: #12121A;        /* Card/panel background */
  --bg-elevated: #1A1A25;         /* Hover, active states */
  --bg-glass: rgba(255,255,255,0.04);  /* Glass morphism fill */

  /* Accent — Brass/Orange (BlackBar brand) */
  --accent-primary: #FF6B35;       /* Primary CTA, links, active states */
  --accent-hover: #FF8355;         /* Hover state */
  --accent-glow: rgba(255,107,53,0.12);  /* Glow behind active elements */
  --accent-subtle: rgba(255,107,53,0.08);  /* Subtle highlight */

  /* Secondary Accent — Gold */
  --accent-secondary: #D4A853;     /* Secondary actions, tags */

  /* Text */
  --text-primary: #F5F5F7;        /* Headings, primary content */
  --text-secondary: #B8B8C0;      /* Body text, descriptions */
  --text-muted: #6B6B78;          /* Labels, timestamps, meta */

  /* Semantic */
  --success: #34D399;             /* Completed stages, passing QA */
  --warning: #FBBF24;             /* QA warnings, pending items */
  --error: #F87171;               /* Errors, critical issues */
  --info: #60A5FA;                /* Informational, research findings */

  /* Borders */
  --border: rgba(255,255,255,0.06);
  --border-accent: rgba(255,107,53,0.30);

  /* Stage Colors */
  --stage-intake: #60A5FA;        /* Blue */
  --stage-research: #A78BFA;      /* Purple */
  --stage-drafting: #FF6B35;      /* Orange (brand) */
  --stage-qa: #FBBF24;           /* Yellow */
  --stage-export: #34D399;        /* Green */
}
```

### Typography

```css
/* Display — page titles, hero text */
font-family: 'Inter', system-ui, sans-serif;
font-weight: 700;
letter-spacing: -0.02em;

/* Body — UI text, descriptions */
font-family: 'Inter', system-ui, sans-serif;
font-weight: 400;
line-height: 1.6;

/* Mono — timestamps, IDs, technical metadata */
font-family: 'JetBrains Mono', 'SF Mono', monospace;
font-size: 0.75rem;

/* Report — rendered report content (matches final PDF) */
font-family: 'Times New Roman', Georgia, serif;
font-size: 12pt;
line-height: 1.6;
text-align: justify;
```

### Spacing Scale

```
4px  — tight (icon gaps, inline spacing)
8px  — compact (list item padding, small gaps)
12px — default (card padding-x, button padding-x)
16px — comfortable (section spacing)
24px — spacious (card padding, column gaps)
32px — section (between major UI blocks)
48px — page (top/bottom page margins)
```

### Glass Morphism Panel

```css
.glass {
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.glass-elevated {
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.glow-border {
  border: 1px solid var(--border-accent);
  box-shadow: 0 0 20px var(--accent-glow);
}
```

### Animations

```css
/* Page transitions */
.page-enter { animation: fadeSlideUp 0.3s ease-out; }
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Card hover */
.card-hover {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}

/* Progress pulse */
.pulse-accent {
  animation: pulseGlow 2s ease-in-out infinite;
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 var(--accent-glow); }
  50% { box-shadow: 0 0 20px 4px var(--accent-glow); }
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-elevated) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## COMPONENT LIBRARY

### 1. GlassCard

```tsx
interface GlassCardProps {
  children: React.ReactNode;
  glow?: boolean;          // orange glow border
  elevated?: boolean;      // stronger glass effect
  padding?: 'compact' | 'default' | 'spacious';
  className?: string;
}
```

Used for: every panel, sidebar section, stat card, document card.

### 2. StageNavV2

```tsx
interface StageNavV2Props {
  currentStage: 'intake' | 'research' | 'drafting' | 'qa' | 'export';
  completedStages: string[];
  agentRunning?: boolean;
  onNavigate: (stage: string) => void;
}
```

**Behavior changes from v1:**
- Each stage shows a **colored dot** with stage-specific color (not just green/gray)
- Running stage has **animated pulse ring** around the dot
- Clicking a completed stage shows its output (not just navigates)
- Between stages: thin **progress line** fills as the agent works
- Hover: tooltip showing "Intake — Completed in 4.2s" or "Research — Waiting for approval"

### 3. ContextualActionButton

```tsx
interface ContextualActionButtonProps {
  stage: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  onAction: () => void;
  disabled?: boolean;
}
```

**Per-stage rendering:**

| Stage | Idle Text | Idle Subtext | Running Text | Complete Text |
|-------|----------|-------------|-------------|--------------|
| intake | "Analyze Documents" | "Classify case, confirm jurisdiction, flag opposing expert" | "Analyzing..." | "Analysis Complete — Review Below" |
| research | "Run Research" | "Resolve flags, identify attack patterns, catalog citations" | "Researching..." | "Research Complete — 4 patterns found" |
| drafting | "Generate Draft" | "Draft report in Lane's voice using research findings" | "Drafting..." | "Draft Complete — 7 sections, review below" |
| qa | "Run QA Audit" | "Check voice, terms, dates, format, benchmark similarity" | "Auditing..." | "QA Complete — Score: 94/100" |
| export | "Export Report" | "Download as DOCX, PDF, or HTML" | N/A | N/A |

### 4. AgentActivityFeedV2

```tsx
interface AgentActivityFeedV2Props {
  logs: SSEMessage[];
  stage: string;
  status: 'idle' | 'running' | 'complete' | 'error';
}
```

**Visual redesign:**
- **Empty state:** "Agent is standing by. Click [action button name] to begin." (not "No activity yet")
- **Running:** Live-updating log with typed icons per message type:
  - `progress` → animated spinner dot + message
  - `finding` → search icon + highlighted card with confidence badge
  - `complete` → checkmark + green highlight + elapsed time
  - `error` → red alert + retry link
- **Brain section callouts:** When message mentions "Brain §X", show as a chip/tag that references ENTERPRISE_BRAIN.md section
- **Auto-scroll** to bottom with "jump to latest" button if user scrolls up
- **Elapsed timer** in header: "Running for 3.2s" (updates live)

### 5. DocumentCard

```tsx
interface DocumentCardProps {
  doc: Doc;
  onPreview: (docId: string) => void;
  onRemove?: (docId: string) => void;
  processing?: boolean;
}
```

**Visual:** Filename, page count, size, upload time. Click → opens inline PDF viewer (react-pdf). Processing state shows extraction progress bar.

### 6. InlinePDFViewer

```tsx
interface InlinePDFViewerProps {
  filepath: string;
  onClose: () => void;
  highlightText?: string[];   // search terms to highlight
}
```

**Implementation:** `react-pdf` wrapper. Renders in a side panel (right 40% of screen) or modal. Page navigation, zoom, text selection. Highlight search terms for cross-referencing.

### 7. HumanCheckpointV2

```tsx
interface HumanCheckpointV2Props {
  stage: string;
  summary: string;
  findings?: Finding[];        // structured data, not just text
  qaScore?: number;            // 0-100 for QA stage
  onApprove: () => void;
  onRevise: (notes: string) => void;
  onReject: () => void;
}
```

**Visual redesign:**
- Full-width overlay with frosted glass background
- Summary section with key findings as cards (not just text)
- QA stage: circular score gauge (0-100) with pass/warn/fail color
- Approve button is primary (orange, large); Revise is secondary; Reject is text-only
- Revise mode: textarea with "What should the agent do differently?" placeholder

### 8. SkeletonLoader

```tsx
interface SkeletonLoaderProps {
  type: 'card' | 'list' | 'text' | 'stat';
  count?: number;
}
```

Replace all "Loading..." text strings with animated skeleton loaders matching the shape of expected content.

### 9. EmptyState

```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}
```

Every page section has a contextual empty state. No "No data" messages — always tell the user what to do.

---

## SCREEN-BY-SCREEN SPECS

### Screen 1: Login

**Current:** Email/password form with "Savage Wins" tagline. Functional but generic.

**v2 Changes:**
- Add BlackBar logo (from `Brand/black-bar-logo-white.png`) centered above form
- Subtitle: "AI-Assisted Expert Report Drafting" below logo
- "Savage Wins" moves to bottom as small footer text
- Add subtle background: dark gradient with faint grid pattern
- Form fields: glass morphism input styling with orange focus ring
- "Sign In" button: full-width, orange, with arrow icon
- Error messages: slide-in from bottom of form, not replace content

**Files touched:** `Login.tsx`, add `src/assets/logo-white.png`

### Screen 2: Dashboard

**Current:** Stats grid (4 cards), case list table, new case modal. Functional.

**v2 Changes:**
- **Welcome header:** "Good morning, Lane" with today's date and next deadline
- **Stats grid:** Keep 4 cards but add micro-sparklines (last 7 days activity)
- **Case list:** Add case type icon (slip/trip/stair/construction), last activity timestamp, progress bar showing pipeline completion %
- **Quick actions row:** Below stats — "New Case" (primary), "Resume [last case name]" (secondary)
- **Deadline alert:** If any case deadline is <7 days, show amber banner at top
- **Empty state:** If no cases, show centered illustration + "Create your first case to get started"

**Files touched:** `Dashboard.tsx`

### Screen 3: Case Intake (the critical screen)

**Current:** 3-column grid — metadata | upload zone + file list + Start Analysis | Agent Activity. Upload and analysis feel disconnected.

**v2 Redesign — Guided Flow:**

```
┌──────────────────────────────────────────────────────────────┐
│  Header: [Case Name] — Initial Report — Clark County         │
│  StageNavV2: ● Intake  ○ Research  ○ Drafting  ○ QA  ○ Export│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────┐  ┌────────────────────────┐ │
│  │  STEP 1: Upload Documents   │  │  Case Details          │ │
│  │                             │  │  (collapsible sidebar) │ │
│  │  ┌───────────────────────┐  │  │                        │ │
│  │  │   Drop zone           │  │  │  Case Type: Slip & Fall│ │
│  │  │   (drag PDF/DOCX)     │  │  │  Report: Initial       │ │
│  │  └───────────────────────┘  │  │  Jurisdiction: Clark Co│ │
│  │                             │  │  Expert: Peterson       │ │
│  │  ┌ Uploaded Documents ────┐ │  │  Deadline: 15 Apr 2026 │ │
│  │  │ Gleason Report.pdf  📄│ │  │                        │ │
│  │  │ 20 pages · 2MB   [👁]  │ │  └────────────────────────┘ │
│  │  │ Deposition.pdf     📄│ │                              │
│  │  │ 45 pages · 512KB [👁]  │ │  ┌────────────────────────┐ │
│  │  └────────────────────────┘ │  │  Agent Activity         │ │
│  │                             │  │                        │ │
│  │  STEP 2: Run Analysis       │  │  [Live feed when       │ │
│  │  ┌───────────────────────┐  │  │   agent is running]    │ │
│  │  │ ▶ Analyze Documents   │  │  │                        │ │
│  │  │ Classify case, confirm│  │  │  Standing by.          │ │
│  │  │ jurisdiction, flag    │  │  │  Upload documents and  │ │
│  │  │ opposing expert       │  │  │  click Analyze to begin│ │
│  │  └───────────────────────┘  │  │                        │ │
│  └─────────────────────────────┘  └────────────────────────┘ │
│                                                              │
│  [HumanCheckpoint overlay appears when analysis completes]   │
└──────────────────────────────────────────────────────────────┘
```

**Key changes:**
1. Upload and Analyze are in the **same column** with "Step 1" and "Step 2" labels — visually connected as a workflow
2. Uploaded documents have **preview icon** (👁) — click opens InlinePDFViewer in right panel, replacing Agent Activity temporarily
3. Agent Activity panel has **contextual empty state** that changes per stage
4. ContextualActionButton replaces generic "Start Analysis" — shows what it does
5. Case Details collapse to a summary bar when the user scrolls down
6. Document cards show **real page count** (from PDF extraction) and file type icon

**Files touched:** `CaseIntake.tsx`, new `DocumentCard.tsx`, new `InlinePDFViewer.tsx`

### Screen 4: Case Research

**Current:** Mock findings in cards, Run Research button, Agent Activity, HumanCheckpoint.

**v2 Changes:**
- **Findings become structured cards** with: Attack pattern ID (ATK-01), confidence badge (0-100%), reasoning excerpt, source citation, and "View in Document" link → opens InlinePDFViewer at the relevant page
- **Brain query display:** Show which ENTERPRISE_BRAIN sections were consulted (§6, §8, §10) as chips
- **Citation catalog:** Collapsible section showing all codes/standards referenced
- **Comparative view:** If opposing expert report is uploaded, show side-by-side: their claim | our counter-argument

**Files touched:** `CaseResearch.tsx`, new `FindingCard.tsx`

### Screen 5: Case Drafting

**Current:** 6-section navigator, HTML editor with preview/source toggle, Run Drafting Agent, Save Draft, Approve.

**v2 Changes:**
- **Section navigator** moves to a vertical sidebar (left) instead of horizontal tabs
- **Editor** gets a **split-pane view**: rendered report on left (Times New Roman, justified, print-preview), source HTML on right (code editor with syntax highlighting)
- **Inline editing:** Click any paragraph in the rendered view to edit it directly (contentEditable)
- **Voice warnings:** If user types a prohibited term (from VOICE.md §11), show inline red underline with tooltip: "SCG doesn't use 'prior to' — use 'before'"
- **Auto-save** every 30 seconds with version badge incrementing
- **Word count** per section in the section navigator

**Files touched:** `CaseDrafting.tsx`, new `SplitEditor.tsx`, new `VoiceChecker.ts`

### Screen 6: Case QA

**Current:** Mock 8-check quality score, issue cards.

**v2 Changes:**
- **Circular score gauge** (0-100) as hero element — green >90, yellow 70-90, red <70
- **Check cards** with expand/collapse — each shows: check name, pass/fail, severity, location in draft, suggested fix, "Go to section" link
- **Benchmark comparison:** "This draft most closely matches: Gleason (Initial Report) — 94% similarity"
- **Prohibited term scan results:** List every flagged term with location and replacement
- **One-click fix:** For certain issues (date format, prohibited terms), offer "Auto-fix" button that applies the correction

**Files touched:** `CaseQA.tsx`, new `ScoreGauge.tsx`, new `QACheckCard.tsx`

### Screen 7: Case Export

**Current:** Report preview (left 2/3), metadata + download sidebar (right 1/3). HTML download works, PDF/DOCX disabled.

**v2 Changes:**
- **Full print preview:** Report renders exactly as it will appear in the DOCX — SCG letterhead, Lane + Mariz signatures, proper margins
- **Download buttons:** All three active — HTML (existing), DOCX (docxtemplater), PDF (Puppeteer server-side)
- **QA badge:** Show QA score and check count: "✓ QA Passed — 94/100, 8/8 checks"
- **Version history:** Collapsible list of all draft versions with timestamps
- **Share controls:** [FUTURE] Email to attorney, generate secure link

**Files touched:** `CaseExport.tsx`

---

## SIDEBAR REDESIGN

**Current:** Fixed w-60, Shield icon, Dashboard + Cases links, user profile at bottom.

**v2 Changes:**
- **Logo:** Replace Shield icon with actual BlackBar logo (`Brand/black-bar-logo-white.png`)
- **Navigation:** Dashboard, Active Cases (expandable with case names), Reference Library [FUTURE], Settings [FUTURE]
- **Recent cases:** Quick-access list of last 3 cases with stage indicators
- **Collapse mode:** Sidebar collapses to icons-only on smaller screens (w-16)
- **User section:** Avatar/initials, name, role badge (Admin/Operator), logout

**Files touched:** `Sidebar.tsx`

---

## IMPLEMENTATION PRIORITY

### Sprint 1: Fix the Pipeline (Day 1-2)

These are non-visual but unblock everything:

```
□ Fix SSE auth — add query param fallback to auth.ts middleware
□ Add ANTHROPIC_API_KEY to Railway env vars
□ Install @anthropic-ai/sdk
□ Create promptLoader.ts — reads VOICE.md + BRAIN.md, injects into system prompt
□ Replace MOCK_STREAMS in agents.ts with real Claude API calls for intake stage
□ Test: trigger intake → receive real SSE messages → checkpoint appears
```

### Sprint 2: Core UI Polish (Day 2-3)

```
□ Design tokens — update tailwind.config.ts with full token set above
□ SkeletonLoader component — replace all "Loading..." text
□ EmptyState component — contextual empty states for every section
□ StageNavV2 — colored dots, pulse animation, progress lines
□ ContextualActionButton — per-stage text and subtext
□ AgentActivityFeedV2 — live timer, typed icons, Brain §X chips
□ HumanCheckpointV2 — full-width overlay, structured findings, score gauge
```

### Sprint 3: Document Experience (Day 3-4)

```
□ Install react-pdf
□ DocumentCard component with preview trigger
□ InlinePDFViewer — side panel rendering, page nav, zoom
□ PDF text extraction on upload (pdf-parse)
□ Real page count in document cards
□ Upload progress indicator
```

### Sprint 4: Editor + QA (Day 4-5)

```
□ SplitEditor — rendered | source side-by-side
□ VoiceChecker — inline prohibited term detection
□ ScoreGauge — circular 0-100 visualization
□ QACheckCard — expand/collapse with auto-fix buttons
□ Section word counts in drafting navigator
□ Auto-save with version badge
```

### Sprint 5: Export + Polish (Day 5)

```
□ DOCX export (docxtemplater with SCG letterhead template)
□ PDF export (Puppeteer server-side rendering)
□ Print preview in export page
□ Page transitions (fadeSlideUp on route changes)
□ Sidebar redesign with logo, recent cases, collapse mode
□ Login page polish with logo and gradient background
```

---

## SUPERVISED DRY-RUN MODE

For Monday's demo with Lane, the system runs in supervised mode:

```typescript
// server/services/agentRunner.ts
const SUPERVISED_MODE = process.env.SUPERVISED_MODE === 'true';

// In Research Agent:
if (SUPERVISED_MODE && brainQuery.includes('§8 Code Citation')) {
  // Instead of looking up code edition from nevada-code-table.md (empty),
  // broadcast SSE message asking Lane to confirm:
  broadcastToCase(caseId, {
    type: 'human_input_needed',
    message: 'Code edition lookup needed — which IBC edition applies to this jurisdiction and permit year?',
    metadata: { field: 'codeEdition', jurisdiction, permitYear }
  });
  // Pause job until Lane responds via HumanCheckpoint
}
```

**Env vars for supervised mode:**
```
SUPERVISED_MODE=true
ANTHROPIC_API_KEY=sk-ant-...
VOICE_MD_PATH=../VOICE.md
BRAIN_MD_PATH=../ENTERPRISE_BRAIN.md
```

---

## DEPENDENCIES TO ADD

```json
{
  "@anthropic-ai/sdk": "^1.0.0",
  "react-pdf": "^9.0.0",
  "pdf-parse": "^1.1.1",
  "mammoth": "^1.8.0",
  "docxtemplater": "^3.50.0",
  "pizzip": "^3.1.7",
  "framer-motion": "^12.0.0",
  "@tanstack/react-query": "^5.0.0",
  "pg-boss": "^10.0.0"
}
```

**Why pg-boss over BullMQ:** Eliminates Redis dependency — uses the existing Railway Postgres for job queue. One fewer service to manage for a 3-user system.

---

## FILE MANIFEST — WHAT CLAUDE CODE CREATES

### New Files

| File | Purpose |
|------|---------|
| `server/services/promptLoader.ts` | Reads VOICE.md + BRAIN.md, constructs system prompts per stage |
| `server/services/agentRunner.ts` | Replaces MOCK_STREAMS — real Claude API calls with SSE broadcasting |
| `server/services/documentProcessor.ts` | PDF/DOCX text extraction on upload |
| `server/services/chunker.ts` | Text → overlapping chunks with metadata |
| `server/services/docxExporter.ts` | DOCX report generation from HTML content |
| `server/services/voiceValidator.ts` | Prohibited term checker (server + client) |
| `server/prompts/intake.md` | Intake agent system prompt template |
| `server/prompts/research.md` | Research agent system prompt template |
| `server/prompts/drafting.md` | Drafting agent system prompt template |
| `server/prompts/qa.md` | QA agent system prompt template |
| `src/components/shared/DocumentCard.tsx` | Document display with preview trigger |
| `src/components/shared/InlinePDFViewer.tsx` | react-pdf wrapper in side panel |
| `src/components/shared/ContextualActionButton.tsx` | Per-stage action button |
| `src/components/shared/ScoreGauge.tsx` | Circular QA score visualization |
| `src/components/shared/QACheckCard.tsx` | Expandable QA check result |
| `src/components/shared/SkeletonLoader.tsx` | Animated loading placeholders |
| `src/components/shared/EmptyState.tsx` | Contextual empty state messages |
| `src/components/shared/SplitEditor.tsx` | Rendered + source side-by-side editor |
| `src/lib/voiceChecker.ts` | Client-side prohibited term detection |

### Modified Files

| File | Changes |
|------|---------|
| `server/middleware/auth.ts` | Add query param token fallback for SSE |
| `server/routes/agents.ts` | Replace MOCK_STREAMS with agentRunner calls |
| `server/routes/documents.ts` | Add text extraction on upload, real page count |
| `server/routes/reports.ts` | Add DOCX export endpoint |
| `prisma/schema.prisma` | Add DocumentChunk model (if pgvector sprint included) |
| `package.json` | Add new dependencies |
| `src/pages/Login.tsx` | Logo, gradient background, polished form |
| `src/pages/Dashboard.tsx` | Welcome header, sparklines, quick actions |
| `src/pages/CaseIntake.tsx` | Guided flow layout, DocumentCard, InlinePDFViewer |
| `src/pages/CaseResearch.tsx` | Structured finding cards, Brain query chips |
| `src/pages/CaseDrafting.tsx` | SplitEditor, VoiceChecker, auto-save |
| `src/pages/CaseQA.tsx` | ScoreGauge, QACheckCard, auto-fix buttons |
| `src/pages/CaseExport.tsx` | Print preview, DOCX/PDF download buttons |
| `src/components/layout/Sidebar.tsx` | Logo, recent cases, collapse mode |
| `src/components/shared/StageNav.tsx` | V2 redesign with colored dots, pulse, progress |
| `src/components/shared/AgentActivityFeed.tsx` | V2 with timer, typed icons, Brain chips |
| `src/components/shared/HumanCheckpoint.tsx` | V2 with structured findings, score gauge |

---

## VALIDATION CRITERIA

After Claude Code executes this spec, verify:

1. **SSE works:** Click "Analyze Documents" → Agent Activity feed shows live messages → checkpoint appears when complete
2. **Voice injected:** Claude API calls include VOICE.md in system prompt — verify via server log
3. **Documents viewable:** Upload a PDF → click preview icon → PDF renders inline in side panel
4. **Guided flow:** New user (Mariz) can create a case and reach Export without asking anyone how
5. **Empty states:** Every page section has a helpful empty state — no "No data" or "Loading..." text
6. **Report quality:** Generated draft reads like Lane wrote it — test with Gleason benchmark comparison
7. **Export works:** Download as HTML (existing), DOCX (new), and PDF (new)
8. **QA score:** QA agent produces a numerical score and structured check results

---

*Spec v2.0 — Built 1 April 2026 for Monday demo with Lane & Mariz*
*Pairs with: ARCHITECTURE_AUDIT_v1.1.md (root cause analysis + execution plan)*
