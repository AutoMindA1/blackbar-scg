# BlackBar v1 — Frontend Architecture Spec

> **Status:** AISDLC Phase 1 Complete — Ready for Phase 2 (Development)
> **Date:** 2026-03-28
> **Author:** Caleb Swainston (Product Owner)
> **Repo:** AutoMindA1/blackbar-scg
> **Scope:** UAT webapp for Lane Swainston + Mariz

---

## 1. System Overview

BlackBar is a 4-agent Claude Code system for forensic expert witness rebuttal reports. This spec defines the **frontend webapp** that wraps those agents into a premium enterprise UI.

### Brand Identity
- **Name:** BlackBar
- **Tagline:** "Savage Wins"
- **Organization:** Swainston Consulting Group
- **Hero Image:** Low-poly geometric bear holding scales of justice (`blackbar-hero.png`)
- **Logo Treatment:** "Black" in text-primary + "Bar" in accent-primary (Fraunces display font)

### Target Users
- **Lane Swainston** — Owner/Stakeholder. Reviews findings, approves stages, exports final reports.
- **Mariz** — Power User/Operator. Uploads documents, monitors agents, manages case flow.

### UAT Scope
- Single-tenant (2 hardcoded users)
- SQLite database (no cloud infra)
- Local file storage
- Express.js backend wrapping agent CLI calls
- Vite dev server for rapid iteration

### Enterprise Brain (ENTERPRISE_BRAIN.md)
Every agent's OODA loop has an Orient step. The Enterprise Brain is the domain knowledge document that feeds those Orient steps with SCG-specific context. Built from Lane's VOICE.md (479 lines, 3 benchmark reports, 9+ filed expert reports).

**15 sections:** Org Profile, Personnel & Credentials, Case Taxonomy, Report Types & Structure, Voice Rules, Analytical Attack Patterns (ATK-01–10), Standard Opinion Blocks (BLK-01–SC), Standards & Codes Reference, Instruments & Testing, Known Adversary (John Peterson), Benchmark Cases, Document Format Rules, Pipeline↔Brain Mapping, Known Gaps, Golden Set Hooks.

**Pipeline↔Brain mapping:**
- **Intake Agent** queries: §3 Case Taxonomy, §4 Report Types, §8 Code Citation, §2 Personnel
- **Research Agent** queries: §6 Attack Patterns, §8 Standards & Codes, §10 Known Adversary, §9 Instruments
- **Drafting Agent** queries: §5 Voice Rules, §7 Standard Blocks, §4 Report Structure, §12 Format Rules
- **QA Agent** queries: §11 Benchmark Cases, §5 Prohibited Terms, §5 Identity/Date, §12 Format Rules

**Drift detection:** 10 golden set questions (BB-001 through BB-010), LLM-as-judge scored 0–100, flag <70.

---

## 2. Tech Stack

### Frontend
- Vite 5
- React 18
- TypeScript 5
- React Router v6
- Tailwind CSS 3
- shadcn/ui (accessible component primitives)
- Lucide React (icons)
- Framer Motion (animations)
- TipTap (rich text editor for draft editing)
- Zustand (state management — 3 stores)

### Backend (UAT)
- Express.js
- better-sqlite3
- Multer (file upload)
- jsonwebtoken (JWT auth)
- SSE (Server-Sent Events for agent streaming)

---

## 3. Design System

### Colors (CSS Variables)
```css
:root {
  --bg-deep: #06080F;
  --bg-base: #0A0E17;
  --bg-surface: #111827;
  --bg-elevated: #1A2340;
  --bg-glass: rgba(17, 24, 39, 0.7);
  --accent-primary: #FF6B35;    /* Warm amber — authority + energy */
  --accent-secondary: #3B82F6;  /* Blue — trust/precision */
  --accent-glow: rgba(255, 107, 53, 0.15);
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --border: #1E293B;
  --border-glow: rgba(255, 107, 53, 0.25);
}
```

### Typography
- **Display:** Fraunces (serif, optical size axis — authority + warmth)
- **Body:** DM Sans (clean, modern readability)
- **Mono:** JetBrains Mono (citations, agent logs, timestamps)

### Design Principles
1. **One CTA per screen** — the user always knows what to do next
2. **Glass morphism cards** — semi-transparent surfaces, backdrop-blur, subtle border glow on hover
3. **Pipeline-driven navigation** — 4-stage pipeline always visible in case detail views
4. **Streaming agent activity** — real-time SSE feed in right sidebar during active stages
5. **Human checkpoint modals** — explicit Approve/Revise/Reject at every stage transition

### Tailwind Config Extensions
```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        deep: '#06080F',
        base: '#0A0E17',
        surface: '#111827',
        elevated: '#1A2340',
        accent: { primary: '#FF6B35', secondary: '#3B82F6', glow: 'rgba(255,107,53,0.15)' },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: { card: '16px', chip: '10px' },
    },
  },
}
```

---

## 4. Page Architecture

### 4.1 Login (`/login`)
- Centered card on dark background with subtle amber radial gradient glow
- **Bear hero image** (low-poly geometric bear holding scales of justice) above logo — `blackbar-hero.png`
- Fraunces headline: "Black**Bar**"
- Tagline: **"Savage Wins"** (italic Fraunces, accent-primary color)
- Subtitle: "Swainston Consulting Group" (uppercase, muted, letterspaced)
- Email + password inputs
- Single CTA: "Sign In"
- No registration — 2 hardcoded users

### 4.2 Dashboard (`/dashboard`)
- **Header bar:** "Dashboard" title + "+ New Case" CTA button
- **Stats grid:** 4 cards — Active Cases, Completed, Avg Turnaround, Pending Review
- **Case list:** Rows with case name, stage badge (color-coded), last activity date
- **Right panel:** Agent Activity feed (recent activity across all cases)
- Click case row → navigates to Case Detail

### 4.3 Case Detail — Intake (`/cases/:id/intake`)
- **Three-column layout:**
  - Left sidebar: case metadata (name, jurisdiction, opposing expert, deadline) — editable
  - Center: Document upload dropzone + uploaded file list (name, size, pages)
  - Right: Agent activity feed (scoped to this case)
- **Pipeline nav** at top showing all 4 stages, Intake highlighted
- CTA: "Start Analysis" (disabled until ≥1 document uploaded)
- On agent completion → HumanCheckpoint modal

### 4.4 Case Detail — Research (`/cases/:id/research`)
- **Summary panel** at top: key findings rollup, total citations found
- **Findings grid:** Citation cards, each showing:
  - Opposing expert claim (quoted)
  - Code/standard reference (e.g., IBC §1604.3)
  - Agent reasoning / rebuttal angle
  - Source document + page number link
- CTA: "Approve Research" → HumanCheckpoint modal

### 4.5 Case Detail — Drafting (`/cases/:id/drafting`)
- **Left sidebar:** Section table of contents (clickable, scrolls to section)
- **Center:** TipTap rich text editor showing draft report
  - Inline agent comments (highlighted, dismissible)
  - Lane can edit text directly
- **Bottom bar:** "Approve Draft" CTA + "Request Revision" secondary action
- Revision adds notes that feed back into Drafting agent re-run

### 4.6 Case Detail — QA (`/cases/:id/qa`)
- **Quality score** hero number (e.g., 94/100)
- **Check categories:** Citation accuracy, voice consistency, formatting compliance, logical coherence
  - Each shows pass/fail badge + detail
- **Issues list:** Severity (Critical/Warning/Info), description, location in report
- CTA: "Approve for Export" or "Send Back" (returns to Drafting)

### 4.7 Export (`/cases/:id/export`)
- **PDF preview** rendered in browser (iframe or react-pdf)
- **Metadata summary:** Case name, expert, date, version number
- **Download options:** PDF button, DOCX button
- No editing — this is the delivery screen
- CTA: "Download Report"

### 4.8 Human Checkpoint Modal (shared component)
- Triggered at every stage transition
- Shows: stage name, agent summary, key metrics
- Three actions:
  - **Approve** → advance to next stage, trigger next agent
  - **Revise** → add text notes → re-run current agent with feedback
  - **Reject** → stop pipeline, return to current stage

---

## 5. Component Map

### Layout
| Component | Purpose |
|-----------|---------|
| `AppShell.tsx` | Sidebar + header + main content + activity panel |
| `Sidebar.tsx` | Navigation links, brand logo, user menu |
| `Header.tsx` | Page title, breadcrumb, action buttons |
| `StageNav.tsx` | 4-stage pipeline progress bar (case detail pages) |

### Dashboard
| Component | Purpose |
|-----------|---------|
| `CaseCard.tsx` | Case row with name, stage badge, date |
| `PipelineView.tsx` | Visual pipeline overview across all cases |
| `StatsGrid.tsx` | 4-stat summary cards |

### Intake
| Component | Purpose |
|-----------|---------|
| `DocumentUpload.tsx` | Drag-drop zone, file list, upload progress |
| `CaseForm.tsx` | Case metadata: name (defendant adv plaintiff), case type (Brain §3), report type (Brain §4), jurisdiction, opposing expert, deadline |
| `IntakeProgress.tsx` | Streaming agent status indicator |

### Research
| Component | Purpose |
|-----------|---------|
| `FindingsGrid.tsx` | Citation cards layout |
| `CitationCard.tsx` | Individual finding: claim → code ref → reasoning |
| `ResearchSummary.tsx` | Key findings rollup panel |

### Drafting
| Component | Purpose |
|-----------|---------|
| `DraftEditor.tsx` | TipTap rich text editor with report content |
| `SectionReview.tsx` | Section navigation sidebar |
| `RevisionPanel.tsx` | Add notes, request agent revision |

### QA
| Component | Purpose |
|-----------|---------|
| `CheckResults.tsx` | Pass/fail per check category |
| `IssuesList.tsx` | Issues with severity badges |
| `QADashboard.tsx` | Overall quality score + check overview |

### Export
| Component | Purpose |
|-----------|---------|
| `ReportPreview.tsx` | PDF rendered in browser |
| `ExportOptions.tsx` | Format selection + download buttons |

### Shared
| Component | Purpose |
|-----------|---------|
| `AgentActivityFeed.tsx` | SSE-powered real-time agent log |
| `HumanCheckpoint.tsx` | Approve/Revise/Reject modal |
| `StageProgress.tsx` | Pipeline step indicator |
| `FileDropzone.tsx` | Reusable drag-drop upload component |

### Zustand Stores
| Store | State |
|-------|-------|
| `authStore.ts` | `user`, `token`, `login()`, `logout()` |
| `caseStore.ts` | `cases[]`, `activeCase`, `fetchCases()`, `createCase()`, `updateStage()` |
| `agentStore.ts` | `status`, `logs[]`, `connectSSE()`, `triggerAgent()` |

---

## 6. API Contract

### Auth
| Method | Endpoint | Body / Params | Response |
|--------|----------|---------------|----------|
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user: { id, name, role } }` |
| GET | `/api/auth/me` | Bearer token | `{ id, name, role }` |

### Cases
| Method | Endpoint | Body / Params | Response |
|--------|----------|---------------|----------|
| POST | `/api/cases` | `{ name, caseType, reportType, jurisdiction, opposingExpert, deadline }` | `{ id, ...case }` |
| GET | `/api/cases` | — | `{ cases: [{ id, name, stage, lastActivity }] }` |
| GET | `/api/cases/:id` | — | `{ id, name, stage, documents[], ...metadata }` |
| PATCH | `/api/cases/:id` | `{ field: value }` | `{ ...updatedCase }` |

### Documents
| Method | Endpoint | Body / Params | Response |
|--------|----------|---------------|----------|
| POST | `/api/cases/:id/documents` | multipart/form-data | `{ documents: [{ id, name, size, pages }] }` |
| GET | `/api/cases/:id/documents` | — | `{ documents: [...] }` |

### Agents
| Method | Endpoint | Body / Params | Response |
|--------|----------|---------------|----------|
| POST | `/api/cases/:id/agents/:stage` | `{ feedback?: string }` | `{ status: 'started', jobId }` |
| GET | `/api/cases/:id/agents/stream` | SSE | Event stream: `{ type, message, timestamp }` |
| POST | `/api/cases/:id/approve` | `{ stage, action: 'approve'|'revise'|'reject', notes? }` | `{ nextStage, status }` |

### Reports
| Method | Endpoint | Body / Params | Response |
|--------|----------|---------------|----------|
| GET | `/api/cases/:id/report` | — | `{ content: string (HTML), sections: [...] }` |
| PUT | `/api/cases/:id/report` | `{ content: string }` | `{ saved: true }` |
| POST | `/api/cases/:id/export` | `{ format: 'pdf'|'docx' }` | Binary file download |

---

## 7. Database Schema (SQLite)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator'  -- 'admin' | 'operator'
);

CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,              -- format: "[Defendant] adv [Plaintiff]" per Brain §5
  case_type TEXT,                  -- Brain §3: slip_fall|trip_fall|stair|walkway|construction|surveillance
  report_type TEXT,                -- Brain §4: initial|rebuttal|supplemental|nth_rebuttal|nth_supplemental
  jurisdiction TEXT,
  opposing_expert TEXT,
  deadline TEXT,
  stage TEXT NOT NULL DEFAULT 'intake',  -- intake|research|drafting|qa|export|complete
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id),
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  size_bytes INTEGER,
  page_count INTEGER,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE agent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT REFERENCES cases(id),
  stage TEXT NOT NULL,
  type TEXT NOT NULL,        -- 'progress' | 'finding' | 'error' | 'complete'
  message TEXT NOT NULL,
  metadata TEXT,             -- JSON blob for structured data
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id) UNIQUE,
  content TEXT,              -- HTML content of draft
  sections TEXT,             -- JSON array of section metadata
  version INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Seed users
INSERT INTO users (id, name, email, password_hash, role) VALUES
  ('usr_lane', 'Lane Swainston', 'lane@swainstonconsulting.com', '$HASH', 'admin'),
  ('usr_mariz', 'Mariz', 'mariz@swainstonconsulting.com', '$HASH', 'operator');
```

---

## 8. User Stories (Gherkin)

### US-001: Login
```gherkin
Given I am Lane or Mariz
When I enter my credentials on the login screen
Then I am authenticated and see the Dashboard
And the header shows my name and role
```

### US-002: Create New Case
```gherkin
Given I am on the Dashboard
When I click "+ New Case"
Then I see the Intake view with case form and upload zone
And the pipeline shows Intake as the active stage
```

### US-003: Upload Case Documents
```gherkin
Given I am on the Intake stage
When I drag PDF/DOCX files into the upload zone
Then files appear in a list with name, size, page count
And the "Start Analysis" button activates
```

### US-004: Trigger Intake Agent
```gherkin
Given at least one document is uploaded
When I click "Start Analysis"
Then the Intake agent processes documents
And I see real-time progress in the activity feed
And on completion, a Human Checkpoint modal appears
```

### US-005: Review Research Findings
```gherkin
Given Intake is approved and Research agent has completed
When I view the Research stage
Then I see findings as citation cards with source links
And each card shows claim → code reference → agent reasoning
```

### US-006: Human Checkpoint Gate
```gherkin
Given an agent has completed its stage
When the checkpoint modal appears
Then I see a summary of agent output
And I can Approve, Revise (with notes), or Reject
And the next agent only runs after explicit approval
```

### US-007: Edit Draft Report
```gherkin
Given the Drafting agent has produced a report
When I view the Drafting stage
Then I see the draft in a rich text editor
And I can make inline edits and add revision notes
And I can approve to advance to QA
```

### US-008: QA Review
```gherkin
Given the QA agent has completed checks
When I view the QA stage
Then I see pass/fail per check category
And issues are listed with severity
And I can approve for export or send back
```

### US-009: Export Final Report
```gherkin
Given QA is approved
When I view the Export stage
Then I see a PDF preview of the final report
And I can download as PDF or DOCX
And the report includes case metadata and version
```

---

## 9. Build Order (Claude Code Execution Plan)

### Phase A: Scaffold + Brain (30 min)
1. `npm create vite@latest blackbar-frontend -- --template react-ts`
2. Install deps: `tailwindcss`, `@tailwindcss/typography`, `zustand`, `react-router-dom`, `lucide-react`, `framer-motion`
3. Configure Tailwind with custom colors/fonts from Section 3
4. Set up Google Fonts import (Fraunces, DM Sans, JetBrains Mono)
5. Create file structure from Section 5
6. Set up React Router with all routes
7. Create `brain/` directory with ENTERPRISE_BRAIN.md, VOICE.md, golden-set.json
8. Copy `blackbar-hero.png` to `public/`

### Phase B: Layout + Auth (45 min)
1. Build `AppShell.tsx` — sidebar + header + main + activity panel
2. Build `Sidebar.tsx` with navigation and brand
3. Build Login page with auth flow
4. Set up `authStore.ts` with JWT handling
5. Add route guards (redirect to login if no token)

### Phase C: Dashboard (30 min)
1. Build `StatsGrid.tsx`
2. Build `CaseCard.tsx` + case list
3. Build "+ New Case" flow (modal or navigate to intake)
4. Wire to `caseStore.ts`

### Phase D: Case Detail — Intake (45 min)
1. Build `StageNav.tsx` pipeline indicator
2. Build `FileDropzone.tsx` with drag-drop
3. Build `CaseForm.tsx`
4. Build `IntakeProgress.tsx` with streaming
5. Build `AgentActivityFeed.tsx` (SSE client)

### Phase E: Research + Drafting + QA + Export (60 min)
1. Research: `FindingsGrid`, `CitationCard`, `ResearchSummary`
2. Drafting: TipTap editor setup, `SectionReview`, `RevisionPanel`
3. QA: `CheckResults`, `IssuesList`, `QADashboard`
4. Export: `ReportPreview`, `ExportOptions`

### Phase F: Human Checkpoint + Polish (30 min)
1. Build `HumanCheckpoint.tsx` modal
2. Wire all stage transitions through checkpoint
3. Add Framer Motion animations (page transitions, card reveals)
4. Glass morphism effects, hover states, border glows

### Phase G: Backend + Brain Integration (75 min)
1. Express.js setup with middleware
2. SQLite schema + seed data (including case_type, report_type fields)
3. Auth routes (login, me)
4. Case CRUD routes
5. Document upload routes
6. Agent trigger routes — `agentRunner.ts` loads ENTERPRISE_BRAIN.md and passes relevant sections per agent:
   - Intake: §3 Case Taxonomy, §4 Report Types, §8 Code Citation, §2 Personnel
   - Research: §6 Attack Patterns, §8 Standards & Codes, §10 Known Adversary, §9 Instruments
   - Drafting: §5 Voice Rules, §7 Standard Blocks, §4 Report Structure, §12 Format Rules
   - QA: §11 Benchmark Cases, §5 Prohibited Terms, §5 Identity/Date, §12 Format Rules
7. SSE stream endpoint
8. Report routes + export endpoint

**Total estimated: ~5.5 hours for full implementation**

---

## 10. Architecture Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend Framework | Vite + React 18 + TS | Claude Code iterates fastest with React. Vite gives instant HMR. |
| Styling | Tailwind + shadcn/ui | Utility-first = no stylesheet context switching. shadcn = accessible primitives. |
| State | Zustand (3 stores) | 1KB, zero boilerplate. Redux is overkill for 2 users. |
| Backend | Express.js + SQLite | Monorepo. Zero infra. Swap to Postgres + proper API when going prod. |
| Agent Comms | SSE | One-directional streaming. Simpler than WebSockets. Native EventSource API. |
| Auth | JWT + hardcoded | 2 users, no registration. Swap to OAuth when going multi-tenant. |
| Rich Text | TipTap (ProseMirror) | Extensible, collab support for later, Claude Code generates TipTap well. |
| File Storage | Local filesystem | No S3 for UAT. Move to S3/R2 when going prod. |
| Display Font | Fraunces | Serif with optical size. Authority + warmth for legal domain. |
| Accent Color | #FF6B35 | Warm amber = precision + expertise. High contrast on dark. |
| Deployment | localhost / LAN | UAT only. Move to Vercel/Railway when validated. |
| Enterprise Brain | ENTERPRISE_BRAIN.md | Domain knowledge layer for agent Orient steps. 15 sections derived from VOICE.md. Drift-detected by golden set. |
