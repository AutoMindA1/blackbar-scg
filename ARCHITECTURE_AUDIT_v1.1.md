# BlackBar v1.1 — Architecture Audit & Fix Sprint
## Full Codebase Analysis | 1 April 2026

---

## ARCHITECTURE SUMMARY (Phase 1)

BlackBar is a monorepo (`webapp/`) containing a React 19 + Vite 8 frontend and an Express 5 + Prisma 6 backend, both in TypeScript 5.9 strict mode, deployed to Railway with Postgres. The frontend has 7 pages (Login, Dashboard, CaseIntake, CaseResearch, CaseDrafting, CaseQA, CaseExport), 3 Zustand stores (auth, case, agent), and a Tailwind CSS design system with custom tokens. The backend exposes 14 REST endpoints across 5 route modules (auth, cases, documents, agents, reports) with JWT auth, rate limiting, and zod validation. **The entire AI pipeline is mocked** — `agents.ts` uses hardcoded `MOCK_STREAMS` with `setTimeout` to simulate agent activity. There are zero Claude API calls, zero document processing, and zero VOICE.md injection anywhere in the codebase. The SSE streaming infrastructure exists but has a critical auth bug that prevents messages from reaching the frontend.

---

## PHASE 2: ANSWERS FROM THE CODE

### Q1: What happens when I click "Start Analysis" and "Export"?

#### Start Analysis — Full Execution Trace

**Frontend:**
1. `CaseIntake.tsx` line 38: `handleStartAnalysis()` calls `clearLogs()` then `triggerAgent(id, 'intake')`
2. `agentStore.ts` line 36: `triggerAgent` sets `status: 'running'`, clears logs, then calls `api.triggerAgent(caseId, stage)`
3. `api.ts` line 46: sends `POST /api/cases/${caseId}/agents/intake` with `{ feedback }` body, `Authorization: Bearer ${token}` header

**Backend:**
4. `agents.ts` line ~70: Route handler validates input, selects `MOCK_STREAMS['intake']` (9 pre-scripted messages)
5. Returns `{ status: 'started', jobId: 'job_${Date.now()}', brainQueries: ['§3 Case Taxonomy', '§4 Report Types', ...] }` **immediately**
6. Fires 9 `setTimeout` calls (cumulative 400ms → 4700ms) that call `broadcastToCase(id, logEntry)` and persist each log to `agent_logs` table

**The SSE channel (where it breaks):**
7. `CaseIntake.tsx` line 21: `useEffect` calls `connectSSE(id)` on mount
8. `agentStore.ts` line 22: `connectSSE` calls `createSSE(caseId, onMessage)`
9. `api.ts` line 64: creates `new EventSource('/api/cases/${caseId}/agents/stream?token=${token}')`
10. **BUG**: EventSource sends a GET request but **cannot set custom headers**. The token is in the query string.
11. `agents.ts` uses `authMiddleware` which reads `req.headers.authorization` (Bearer header)
12. **Auth fails → 401 → EventSource auto-reconnects → infinite retry loop**
13. No SSE messages ever reach the frontend → `status` stays `'running'` forever → **spinner never stops**

**Root Cause: SSE authentication mismatch.** The client sends the JWT as a query parameter (`?token=...`), but the server middleware only reads the `Authorization` header. EventSource API does not support custom headers. The mock messages fire and complete in ~5 seconds on the server, but the frontend never receives them.

**There is no Claude API call anywhere.** No `ANTHROPIC_API_KEY` env var, no `@anthropic-ai/sdk` dependency, no fetch to `api.anthropic.com`. The entire agent system is pre-scripted mock data.

#### Export — Full Execution Trace

**Frontend:**
1. `CaseExport.tsx` line 23: `handleDownloadHTML()` constructs an HTML string entirely client-side
2. Creates a Blob, generates an object URL, creates an `<a>` element, triggers `.click()`, revokes URL
3. **This is instant — no server call.** Export does NOT hang.

**Server export endpoint exists but is unused:**
4. `reports.ts` line ~50: `POST /:id/export` generates an HTML file server-side and returns it as attachment
5. The frontend never calls this endpoint — it builds the HTML locally

**Verdict:** Export works for HTML. PDF and DOCX buttons are disabled ("Coming Soon"). If Export appeared to hang, the user may have been observing a prior "Start Analysis" that was still spinning.

---

### Q2: What would need to change for production?

| Gap | Current State | Production Requirement | Effort |
|-----|--------------|----------------------|--------|
| **AI Integration** | Zero AI calls — entire pipeline is mocked | Claude API integration with VOICE.md system prompts, document processing, report generation | **L** |
| **SSE Auth** | EventSource can't send Bearer header; auth fails silently | Token-in-query or polled fallback; server reads from query param | **S** |
| **Document Storage** | `multer` writes to `webapp/uploads/` (ephemeral filesystem) | S3/R2 object storage — Railway filesystem resets on redeploy | **M** |
| **Document Processing** | Files stored but never read/parsed — zero text extraction | PDF extraction (pdf-parse), chunking, embedding pipeline | **L** |
| **Connection Pooling** | `new PrismaClient()` singleton, no pool config | Prisma connection pool `connection_limit`, `pool_timeout` in DATABASE_URL | **S** |
| **CORS** | Hardcoded `localhost:5173/5174`; no production origin | Add Railway domain to ALLOWED_ORIGINS; consider wildcard removal | **S** |
| **SSL** | Railway provides SSL by default | Confirm HTTPS-only, add HSTS header | **S** |
| **Custom Domain** | Using Railway `.up.railway.app` subdomain | Custom domain + DNS + cert | **S** |
| **JWT Secret** | Hardcoded `"blackbar-savage-wins-2026"` in `.env` | Move to Railway env vars (already possible); rotate to random 256-bit | **S** |
| **Rate Limiting** | Login only (5/15min) | Add rate limits to document upload, agent trigger, report save | **S** |
| **Error Handling** | Per-route try/catch; no global handler | Express error middleware, structured error logging, Sentry/equivalent | **M** |
| **Logging** | `console.log` only | Structured JSON logger (pino/winston), log to Railway log drain | **M** |
| **Backup** | No backup strategy | Railway daily snapshots + pg_dump cron to S3 | **M** |
| **Multi-user** | No data isolation — all users see all cases | Add `createdBy` filter or team-based access control | **S** |
| **Upload Size** | 50MB per file, 20 files per request | Adequate for now; add progress indicator for large uploads | **S** |
| **Page Count** | Estimated as `Math.floor(size / 3000)` — fake | Real page count from PDF parser | **S** |
| **Report Versioning** | Integer version, overwrites content | Keep version history (separate table or JSONB array) | **M** |
| **DOCX/PDF Export** | HTML only; PDF/DOCX buttons disabled | docx templating (docxtemplater) + PDF generation (puppeteer/weasyprint) | **M** |

---

### Q3: What would make this faster and more performant?

| Bottleneck | Current Implementation | Fix | Impact |
|-----------|----------------------|-----|--------|
| **No document processing** | Files stored as raw blobs; never parsed | PDF text extraction + chunking pipeline (pdf-parse → chunks → pgvector) | **Critical** |
| **Synchronous mock agents** | setTimeout fires mock messages; no job queue | Bull/BullMQ with Redis, or pg-boss on Postgres — async job processing | **High** |
| **No caching** | Every page load fetches full case + docs + logs from DB | React Query (TanStack Query) on frontend; Redis cache for hot case data | **High** |
| **SSE per-case map** | In-memory Map of SSE connections; no persistence | Redis pub/sub for multi-instance SSE broadcast | **Med** (single instance OK for now) |
| **No database indexing** | Prisma default indices only (PK + unique) | Add index on `agent_logs(case_id, created_at)`, `documents(case_id)` | **Med** |
| **Full case include** | GET /cases/:id includes all docs + 50 logs + report | Paginate logs, lazy-load report content | **Med** |
| **Static assets** | Express serves Vite build from `dist/` | CDN or Railway static site for frontend; API-only backend | **Low** |
| **No streaming for generation** | N/A (mocked) | When real: stream Claude response tokens via SSE for live drafting preview | **High** |
| **Single Prisma client** | Works for low concurrency | Fine for 3 users; add connection pool params if scaling beyond | **Low** |
| **No document deduplication** | Same file can be uploaded multiple times | Hash-based dedup (SHA-256 on upload) | **Low** |

---

### Q4: What does 100% look like?

#### Target Architecture — Component List

| Component | Purpose | Exists Today? | What's Missing | Build vs Buy |
|-----------|---------|--------------|----------------|-------------|
| **React Frontend** | UI for case management, document upload, report editing, export | Yes — 7 pages, Tailwind | Inline PDF viewer, guided flow, Lemonade-style polish | Build (enhance existing) |
| **Express API** | REST endpoints for all operations | Yes — 14 endpoints | Real agent orchestration, streaming, export formats | Build (enhance existing) |
| **Prisma + Postgres** | Case, document, report, user storage | Yes — 5 models | Vector storage column, job queue table, version history | Build (add models) |
| **PDF Extraction Service** | Parse PDF/DOCX → raw text | No | Everything | Build (pdf-parse + mammoth) |
| **Document Chunking Pipeline** | Split text → overlapping chunks → metadata tagging | No | Everything | Build |
| **Vector Embeddings** | Embed chunks for semantic search | No | Everything | Build (pgvector + OpenAI embeddings or Claude) |
| **Agent Orchestrator** | Run 4-stage pipeline: Intake→Research→Drafting→QA | Mock only | Real Claude API integration, prompt templates, VOICE.md injection | Build |
| **Job Queue** | Async background processing for AI calls | No | Everything | Build (BullMQ or pg-boss) |
| **Prompt Template Engine** | Stage-specific prompts loading VOICE.md + BRAIN.md at runtime | No | Everything | Build |
| **DOCX Export** | Generate Word doc matching SCG report format | No | Everything | Build (docxtemplater or officegen) |
| **PDF Export** | Generate print-ready PDF | No | Everything | Build (Puppeteer) |
| **Inline PDF Viewer** | View uploaded documents in-app | No | Everything | Buy (react-pdf / pdf.js) |
| **Object Storage** | Persistent file storage surviving redeploys | No | Everything | Buy (Railway volume or S3) |

#### Data Flow: Upload → Analysis → Export

```
User drops PDF(s)
    │
    ▼
[Upload API] ─── multer ──► [Object Storage]
    │                              │
    │                              ▼
    │                    [PDF Extraction Worker]
    │                     pdf-parse / mammoth
    │                              │
    │                              ▼
    │                    [Chunking Pipeline]
    │                     split → tag (own/opposing) → overlap
    │                              │
    │                              ▼
    │                    [Embedding Worker]
    │                     OpenAI text-embedding-3-small
    │                              │
    │                              ▼
    │                    [pgvector storage]
    │                     chunks + vectors + metadata
    │
    ▼
[Agent Trigger API] ─► [Job Queue]
    │                        │
    │                        ├─► [Intake Agent Job]
    │                        │    System: VOICE.md §1-4 + BRAIN §3,4,8,2
    │                        │    Input: raw text chunks
    │                        │    Output: intake.md → cases/[ID]/
    │                        │    SSE: stream progress to frontend
    │                        │
    │                        ├─► [Research Agent Job]
    │                        │    System: VOICE.md + BRAIN §6,8,9,10
    │                        │    Input: intake.md + vector search results
    │                        │    Output: research.md
    │                        │
    │                        ├─► [Drafting Agent Job]
    │                        │    System: VOICE.md (full) + BRAIN §5,7,4,12
    │                        │    Input: research.md + benchmark PDF
    │                        │    Output: draft.md (HTML sections)
    │                        │
    │                        └─► [QA Agent Job]
    │                             System: VOICE.md §5,11 + BRAIN §11,5,12
    │                             Input: draft.md + intake.md
    │                             Output: qa-report.md + scored checklist
    │
    ▼
[Human Checkpoint] ─── approve / revise / reject
    │
    ▼
[Export API] ─► DOCX (docxtemplater) / PDF (Puppeteer) / HTML (existing)
```

#### Tech Stack Additions

| Addition | Purpose | Rationale |
|----------|---------|-----------|
| `@anthropic-ai/sdk` | Claude API calls | Core AI integration |
| `pdf-parse` | PDF text extraction | Lightweight, proven |
| `mammoth` | DOCX text extraction | For opposing counsel Word docs |
| `pgvector` extension | Vector similarity search on Postgres | Already on Railway Postgres |
| `bullmq` + `ioredis` | Job queue for async agent processing | Production-grade, retries, progress events |
| `react-pdf` | Inline PDF viewer | 200KB, mature, pdf.js wrapper |
| `docxtemplater` | DOCX report generation | Template-driven, SCG letterhead compatible |
| `puppeteer-core` | PDF generation from HTML | Same output as print, pixel-perfect |
| `@tanstack/react-query` | Frontend data caching + optimistic updates | Eliminates redundant fetches |

---

## PHASE 3: KNOWN ISSUES — CONFIRMED, CORRECTED, EXPANDED

### Issue 1: Start Analysis / Export hangs for 20+ minutes

**Your Hypothesis:** No Claude API key configured, so the call either fails silently or never fires.

**Corrected Root Cause (confirmed from code):**

There are **two separate problems**:

**Problem 1A — SSE Auth Mismatch (the spinner bug):**
- `api.ts:65` creates `EventSource` with token in query param: `?token=${token}`
- `agents.ts` applies `authMiddleware` which reads `req.headers.authorization` (Bearer header)
- EventSource API **cannot set custom headers**
- Result: SSE GET returns 401 → EventSource auto-retries in loop → frontend never receives messages → `status` stays `'running'` forever → spinner never stops
- **This is why the spinner runs "20 minutes"** — it's actually running forever until the user navigates away

**Problem 1B — No real AI (the fundamental gap):**
- `agents.ts` uses `MOCK_STREAMS` — hardcoded arrays of `{ type, message, delay }` objects
- `setTimeout` fires them sequentially over ~5 seconds
- **Zero Claude API calls exist in the codebase**
- No `ANTHROPIC_API_KEY` env var, no `@anthropic-ai/sdk` in package.json
- Even if SSE auth is fixed, the "analysis" is a pre-scripted 5-second animation
- The mock does persist log entries to `agent_logs` table, which is good scaffolding

**Fix Plan:**

| Step | What | Files | Effort |
|------|------|-------|--------|
| 1A-fix | Add query-param token fallback to auth middleware | `server/middleware/auth.ts` | 10 min |
| 1B-fix | Install `@anthropic-ai/sdk`, add `ANTHROPIC_API_KEY` to env | `package.json`, `.env`, Railway | 15 min |
| 1C-fix | Create prompt template loader (reads VOICE.md + BRAIN.md at runtime) | New: `server/services/promptLoader.ts` | 1 hr |
| 1D-fix | Replace MOCK_STREAMS with real Claude API calls per stage | `server/routes/agents.ts` → refactor to `server/services/agentRunner.ts` | 4 hr |
| 1E-fix | Add BullMQ job queue for async processing | New: `server/services/jobQueue.ts` | 2 hr |
| 1F-fix | Wire SSE to job progress events | `server/routes/agents.ts` SSE handler | 1 hr |
| 1G-fix | Add timeout (5 min), retry (3x), and error surfacing | `server/services/agentRunner.ts` | 1 hr |

**Total: ~10 hours for real agent integration**

---

### Issue 2: Cannot handle 800–1,000 pages

**Confirmed.** Zero document processing exists. Files are stored by multer but **never read or parsed**. The `pageCount` field is faked: `Math.max(1, Math.floor(f.size / 3000))`.

**What's needed:**

| Step | What | Files | Effort |
|------|------|-------|--------|
| 2A | PDF text extraction on upload | New: `server/services/documentProcessor.ts` (pdf-parse + mammoth) | 2 hr |
| 2B | Chunking pipeline (1000-token chunks, 200-token overlap, metadata tags) | New: `server/services/chunker.ts` | 2 hr |
| 2C | Enable pgvector extension on Railway Postgres | Prisma migration + `CREATE EXTENSION vector` | 30 min |
| 2D | Add `DocumentChunk` model with vector column | Prisma schema update | 30 min |
| 2E | Embedding pipeline (OpenAI text-embedding-3-small or Claude) | New: `server/services/embedder.ts` | 2 hr |
| 2F | Vector similarity search for Research Agent context retrieval | New: `server/services/vectorSearch.ts` | 1 hr |
| 2G | Map-reduce for full-document analysis (chunk → analyze → merge) | Extension of agentRunner | 2 hr |
| 2H | Own/opposing document tagging + contradiction surfacing | Metadata field on chunks | 1 hr |

**Total: ~11 hours for full document pipeline**

---

### Issue 3: Lane's Voice is inconsistent or absent

**Confirmed.** VOICE.md (478 lines) and ENTERPRISE_BRAIN.md (372 lines) exist and are well-structured, but **neither file is loaded or referenced by any server-side code**. The mock agent messages mention "Brain §3" and "Brain §5" but these are hardcoded strings — no file I/O occurs.

**What's needed:**

| Step | What | Files | Effort |
|------|------|-------|--------|
| 3A | Prompt template per stage (intake/research/drafting/qa) | New: `server/prompts/intake.md`, `research.md`, `drafting.md`, `qa.md` | 2 hr |
| 3B | Template loader reads VOICE.md + BRAIN.md at runtime, injects into system prompt | New: `server/services/promptLoader.ts` (same as 1C) | (included above) |
| 3C | VOICE.md goes in `system` prompt; case facts go in `user` prompt | Architecture decision in agentRunner | 30 min |
| 3D | Add `VOICE_MD_PATH` and `BRAIN_MD_PATH` env vars | `.env`, Railway config | 10 min |
| 3E | Validation test: generate sample paragraph, run prohibited-terms check | New: `server/services/voiceValidator.ts` | 1 hr |
| 3F | Golden Set drift test per BRAIN §15 | Test script comparing output to benchmark excerpts | 2 hr |

**Total: ~5.5 hours (with 1C overlap)**

---

### Issue 4: UX scored at 53%, target 98%

**Confirmed.** Every specific gap identified is real:

| Gap | Confirmed? | Current State in Code |
|-----|-----------|----------------------|
| No inline document preview | **YES** | Documents shown as filename + size text only (`CaseIntake.tsx:109-119`) |
| Pipeline stages decorative | **PARTIAL** | Stages are clickable and navigate to correct pages (`StageNav.tsx:21-35`), but stage pages show mock/static data |
| Start Analysis has no context | **YES** | Button says "Start Analysis" with no explanation (`CaseIntake.tsx:125-130`) |
| Agent Activity dead | **YES** — root cause identified | SSE auth bug prevents messages from reaching `AgentActivityFeed` component |
| No guided flow | **YES** | No empty states, no progressive disclosure, no "what to do next" |
| Upload/Analysis disconnected | **YES** | Upload zone and button are in same column but no visual connection |

**Additional UX issues found during audit:**

| Issue | Location | Severity |
|-------|----------|----------|
| Login page says "Savage Wins" with no explanation of what BlackBar is | `Login.tsx` | Med |
| No loading skeleton — just "Loading..." text | Multiple pages | Med |
| Sidebar only has 2 links (Dashboard, Cases) — Cases link goes nowhere useful | `Sidebar.tsx` | Low |
| No breadcrumbs — user loses context inside case pages | All case pages | Med |
| Report editor uses `dangerouslySetInnerHTML` with user content | `CaseDrafting.tsx`, `CaseExport.tsx` | **High** (XSS risk) |
| No responsive design — grid-cols-3 breaks on tablet/mobile | All case pages | Med |
| Dark theme only — no light mode option | Global CSS | Low |

---

## PRIORITIZED ACTION PLAN

### Execution Order (dependency-driven)

```
WEEK 1 — UNBLOCK THE PIPELINE
│
├── Day 1: SSE Auth Fix + CORS + JWT Secret    [1A, infra fixes]
│   └── Dependency: none — pure bugfix
│
├── Day 1-2: Document Processing Pipeline      [2A-2D]
│   └── Dependency: none — new service
│
├── Day 2-3: Claude API Integration             [1B-1D]
│   └── Dependency: 2A (needs extracted text to send to Claude)
│
├── Day 3: Prompt Templates + VOICE.md Loader   [3A-3D]
│   └── Dependency: 1B (needs Claude SDK installed)
│
├── Day 4: Job Queue + SSE Wiring               [1E-1G]
│   └── Dependency: 1D (wraps agent calls in queue)
│
├── Day 5: Vector Search + Embeddings           [2E-2H]
│   └── Dependency: 2B-2D (needs chunks + pgvector)
│
WEEK 2 — UX + EXPORT + QA
│
├── Day 6-7: Lemonade-style UI Overhaul         [4-all]
│   └── Dependency: 1A (SSE fix makes activity feed work)
│
├── Day 8: DOCX/PDF Export                      [export]
│   └── Dependency: drafting agent produces real content
│
├── Day 9: Voice Validation + Golden Set Tests  [3E-3F]
│   └── Dependency: 3A-3D (needs working prompts)
│
├── Day 10: End-to-end test with Lane           [supervised dry run]
│   └── Dependency: all of the above
```

### Scope per Fix

| Fix | Files Touched | New Dependencies | Migration Needed? |
|-----|--------------|-----------------|-------------------|
| SSE Auth | `server/middleware/auth.ts` | None | No |
| Claude API | `package.json`, `server/services/agentRunner.ts` (new) | `@anthropic-ai/sdk` | No |
| Doc Processing | `server/services/documentProcessor.ts` (new), `server/services/chunker.ts` (new) | `pdf-parse`, `mammoth` | No |
| pgvector | `prisma/schema.prisma`, migration file | `pgvector` Postgres extension | **Yes** |
| Job Queue | `server/services/jobQueue.ts` (new), `server/routes/agents.ts` | `bullmq`, `ioredis` (or `pg-boss` for Postgres-only) | No |
| Prompt Templates | `server/prompts/*.md` (4 new), `server/services/promptLoader.ts` (new) | None | No |
| Inline PDF Viewer | `package.json`, `src/components/shared/DocumentViewer.tsx` (new), `src/pages/CaseIntake.tsx` | `react-pdf` | No |
| DOCX Export | `server/services/docxExporter.ts` (new) | `docxtemplater`, `pizzip` | No |
| PDF Export | `server/services/pdfExporter.ts` (new) | `puppeteer-core` | No |
| UI Overhaul | All 7 pages, all 5 components, `tailwind.config.ts`, new components | `@tanstack/react-query`, `framer-motion` | No |

---

## PHASE 4: NAVIGATION AIDS

### DIRECTORY_MAP.md

```
BLACK-BAR/
├── VOICE.md                          # Lane's writing voice — 478 lines, 20 sections
├── ENTERPRISE_BRAIN.md               # Domain knowledge — 15 sections, 372 lines
├── PIPELINE.md                       # 4-agent pipeline architecture
├── CLAUDE_CODE_HANDOFF.md            # Context handoff for Claude Code sessions
├── lane-responses-2026-03-28.md      # Lane's GTM answers (8 questions)
├── ARCHITECTURE_AUDIT_v1.1.md        # THIS FILE — full codebase audit
├── BLACKBAR_FRONTEND_SPEC.md         # Frontend spec (prior session)
├── BLACKBAR_ENTERPRISE_BRAIN.md      # Duplicate/draft of ENTERPRISE_BRAIN.md
├── 2026-03-26_agent-team-pressure-test.md  # Agent team stress test results
├── README.md                         # Repo README
├── .env                              # DB URL, JWT secret, port
├── railway.toml                      # Railway deploy config
│
├── webapp/                           # FULL APPLICATION
│   ├── package.json                  # 45 deps — React 19, Express 5, Prisma 6, Vite 8
│   ├── vite.config.ts                # Dev proxy to :3001, Tailwind plugin
│   ├── tsconfig.json                 # Strict TS config
│   ├── prisma/
│   │   └── schema.prisma             # 5 models: User, Case, Document, AgentLog, Report
│   ├── server/
│   │   ├── index.ts                  # Express app — helmet, CORS, 14 endpoints, static serve
│   │   ├── db.ts                     # PrismaClient singleton
│   │   ├── seed.ts                   # 2 users, 3 benchmark cases, 6 docs, 12 logs, 2 reports
│   │   ├── middleware/
│   │   │   └── auth.ts               # JWT verification (Bearer header only — BUG)
│   │   └── routes/
│   │       ├── auth.ts               # POST /login (rate-limited), GET /me
│   │       ├── cases.ts              # CRUD: POST /, GET /, GET /:id, PATCH /:id
│   │       ├── documents.ts          # POST /:id/documents (multer), GET /:id/documents
│   │       ├── agents.ts             # POST /:id/agents/:stage (MOCK), GET /stream (SSE), POST /approve
│   │       └── reports.ts            # GET /:id/report, PUT /:id/report, POST /:id/export
│   ├── src/
│   │   ├── lib/
│   │   │   └── api.ts                # Fetch wrapper, SSE client, TypeScript interfaces
│   │   ├── stores/
│   │   │   ├── authStore.ts          # Zustand — login, logout, token persistence
│   │   │   ├── caseStore.ts          # Zustand — cases list, active case, CRUD
│   │   │   └── agentStore.ts         # Zustand — SSE connection, agent status, logs
│   │   ├── pages/
│   │   │   ├── Login.tsx             # Email/password form, branded header
│   │   │   ├── Dashboard.tsx         # Stats grid, case list, new case modal
│   │   │   ├── CaseIntake.tsx        # Upload zone, Start Analysis, Agent Activity
│   │   │   ├── CaseResearch.tsx      # Mock findings display, Run Research button
│   │   │   ├── CaseDrafting.tsx      # Section editor, HTML preview/source toggle
│   │   │   ├── CaseQA.tsx            # 8-check quality score, issue cards
│   │   │   └── CaseExport.tsx        # Report preview, HTML download, PDF/DOCX disabled
│   │   └── components/
│   │       ├── layout/
│   │       │   ├── AppShell.tsx       # Auth guard, sidebar + outlet layout
│   │       │   ├── Header.tsx         # Page header with title/subtitle/action
│   │       │   └── Sidebar.tsx        # Fixed sidebar — brand, nav, user profile
│   │       └── shared/
│   │           ├── StageNav.tsx       # 5-stage pipeline nav (intake→export)
│   │           ├── AgentActivityFeed.tsx  # Real-time log display (broken by SSE bug)
│   │           └── HumanCheckpoint.tsx    # Approve/revise/reject modal
│   └── uploads/                      # Ephemeral file storage (lost on redeploy)
│
├── agents/                           # AGENT PROMPT DEFINITIONS
│   ├── intake/
│   │   └── BlackBar-Intake.md        # Intake Agent — schema, behavior rules, handoff
│   ├── research/                     # [ASSUMPTION: AGENT.md exists per PIPELINE.md]
│   ├── drafting/                     # [ASSUMPTION: AGENT.md exists per PIPELINE.md]
│   └── qa/                           # [ASSUMPTION: AGENT.md exists per PIPELINE.md]
│
├── benchmarks/                       # FILED REPORT SAMPLES
│   ├── SCG Report - Gleason.pdf      # Benchmark: Initial Report (2 Feb 2026)
│   ├── SCG Rebuttal Report - Heagy.pdf  # Benchmark: Rebuttal Report (23 Jan 2026)
│   └── SCG Supplemental Report - Anderson.pdf  # Benchmark: Supplemental (2 Dec 2025)
│
├── reference/                        # DOMAIN REFERENCE DATA
│   ├── nevada-code-table.md          # Jurisdiction code adoption (dates unpopulated)
│   ├── ada-edition-map.md            # ADA/A117.1 edition mapping
│   ├── credential-registry.md        # CXLT registry lookup procedures
│   ├── cxlt-fallback.md              # Fallback when CXLT registry is down
│   ├── nfsi-thresholds.md            # NFSI B101.1/B101.3 threshold values
│   └── peterson-playbook.md          # Counter-arguments for John Peterson
│
├── templates/                        # REPORT TEMPLATES
│   ├── contributory-negligence-gate.md   # Block 7 gate rules
│   └── limitation-disclosure.md          # FRE 407/NRS 48.135 compliant disclosure
│
├── Cases/                            # CASE FILES (local only, untracked)
│   ├── 00-opposing-experts/          # Opposing expert reports/docs
│   ├── 01-premises-liability/        # Premises liability case files
│   ├── 01-premises-liability.zip
│   ├── 02-design-and-construction/   # Design/construction case files
│   ├── 02-design-and-construction.zip
│   ├── 03-photographic-video-analysis/  # Photo/video analysis files
│   ├── 03-photographic-video-analysis.zip
│   └── README.md
│
├── Docs/                             # SPECIFICATIONS & DOCUMENTATION
│   ├── BlackBar_Architecture.html    # 10-tab architecture spec (prior session)
│   └── blackbar-architecture-diagram.html
│
├── Brand/                            # BRAND ASSETS
├── Legal/                            # LEGAL TEMPLATES/DOCS
├── Media/                            # MEDIA FILES
├── Workflows/                        # WORKFLOW DEFINITIONS
├── reports/                          # GENERATED REPORTS
├── scripts/                          # UTILITY SCRIPTS
└── "Referenceable Construction Code Files"/  # CONSTRUCTION CODE PDFS
```

### QUICKFIND.md

| If I need... | Go to... | Key file(s) |
|-------------|---------|-------------|
| Architecture / system design | `Docs/` | `BlackBar_Architecture.html`, `ARCHITECTURE_AUDIT_v1.1.md` |
| Voice / writing style | Root | `VOICE.md` (478 lines, 20 sections) |
| Domain knowledge / brain | Root | `ENTERPRISE_BRAIN.md` (372 lines, 15 sections) |
| Pipeline stage definitions | Root | `PIPELINE.md` |
| Agent prompt definitions | `agents/` | `agents/intake/BlackBar-Intake.md`, etc. |
| Webapp source code | `webapp/src/` | Pages in `pages/`, stores in `stores/`, API in `lib/api.ts` |
| Backend routes | `webapp/server/routes/` | `agents.ts` (mock pipeline), `cases.ts`, `documents.ts` |
| Database schema | `webapp/prisma/` | `schema.prisma` (5 models) |
| Benchmark reports | `benchmarks/` | Gleason.pdf, Heagy.pdf, Anderson.pdf |
| Case files (real) | `Cases/` | Subfolders by category |
| Reference data | `reference/` | `nevada-code-table.md`, `peterson-playbook.md`, etc. |
| Report templates | `templates/` | `contributory-negligence-gate.md`, `limitation-disclosure.md` |
| Deployment config | Root + `webapp/` | `railway.toml`, `.env`, `package.json` |
| Session handoffs | Root | `CLAUDE_CODE_HANDOFF.md`, `lane-responses-2026-03-28.md` |
| Frontend spec | Root | `BLACKBAR_FRONTEND_SPEC.md` |
| Jurisdiction codes | `reference/` | `nevada-code-table.md` (dates unpopulated) |
| Brand assets | `Brand/` | Logo, colors, mascot |
| Construction code PDFs | `Referenceable Construction Code Files/` | Varies |
| Opposing expert playbooks | `reference/` | `peterson-playbook.md` |
| Credential verification | `reference/` | `credential-registry.md`, `cxlt-fallback.md` |

---

## ENV VARS — COMPLETE INVENTORY

| Variable | Current Value | Where Set | Production Action |
|----------|-------------|-----------|-------------------|
| `DATABASE_URL` | Railway internal Postgres URL | `.env` + Railway | Keep in Railway only; remove from `.env` |
| `JWT_SECRET` | `"blackbar-savage-wins-2026"` | `.env` | **Rotate** to random 256-bit; set in Railway only |
| `PORT` | `3001` | `.env` | Railway sets automatically |
| `ALLOWED_ORIGINS` | Not set (defaults to localhost) | Nowhere | **Add** Railway domain |
| `ANTHROPIC_API_KEY` | **DOES NOT EXIST** | Nowhere | **Add** to Railway env vars |
| `VOICE_MD_PATH` | **DOES NOT EXIST** | Nowhere | **Add** — path to VOICE.md |
| `BRAIN_MD_PATH` | **DOES NOT EXIST** | Nowhere | **Add** — path to ENTERPRISE_BRAIN.md |

---

## QUALITY GATES

| Check | Status |
|-------|--------|
| □ Respected 3-phase structure | ✅ Research (Phase 1-2) → Synthesis (Phase 3) → Deliver (Phase 4) |
| □ Confirmation gate applied correctly | ✅ No borrower-facing/compliance/irreversible outputs |
| □ Judge mode invoked | ✅ Corrected user's hypothesis on root cause (not missing API key — SSE auth bug) |
| □ Domain shorthand used | ✅ No basics explained |
| □ Context rules honored | ✅ No LDS/LinkedIn content mixed |
| □ Math/calc outputs | N/A |
| □ Compliance-adjacent | N/A |
| □ Multi-lender outputs | N/A |
| □ No prohibited outputs | ✅ |

---

*Audit completed 1 April 2026 from full source code read of 24 files across webapp/, agents/, reference/, templates/, and root.*
