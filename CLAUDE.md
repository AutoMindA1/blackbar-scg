# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BlackBar is an AI-assisted forensic expert report drafting system for Swainston Consulting Group (SCG). It moves cases through a 4-stage sequential pipeline — Intake, Research, Drafting, QA — with one human checkpoint (Lane's review) before delivery. All webapp code lives in `webapp/`.

### Corporate structure ("Blast Door" architecture)
SCG is the parent holding company. Three LLCs provide legal/financial isolation:
- **Swainston AI, LLC** — Owns BlackBar IP (code, prompts, agent specs). Maps to `entityType: 'swainston_ai'` in the Organization model.
- **Tactical Resources, LLC** — Owns hardware/cloud contracts. Maps to `entityType: 'tactical_resources'`.
- **Swainston Digital Imaging, LLC** — Service delivery. Maps to `entityType: 'digital_imaging'`.

The cardinal rule: each entity's financials are tracked separately. The `UsageRecord` table meters AI costs per organization. Never commingle accounting across entities.

## Commands (run from `webapp/`)

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite + Express concurrently (frontend :5173, API :3001) |
| `npm run build` | `tsc -b` + `vite build` + `tsc -p tsconfig.server.json` |
| `npm run lint` | ESLint flat config (TS + React hooks + React Refresh) |
| `npm test` | Run Vitest test suite (60 tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with v8 coverage |
| `npm run db:generate` | Prisma generate client |
| `npm run db:migrate` | Prisma migrate dev (requires DATABASE_URL) |
| `npm run db:migrate:deploy` | Prisma migrate deploy (production) |
| `npm run db:push` | Push schema to PostgreSQL (dev shortcut) |
| `npm run db:seed` | Seed database via tsx |
| `npm run start` | `node dist/server/index.js` (production only) |

CI runs `tsc --noEmit`, `npm run build`, and `npm test` as the quality gate.

## Architecture

### Build pipeline
- **Frontend**: Vite builds to `webapp/dist/client/` (React 19 SPA)
- **Server**: `tsc -p tsconfig.server.json` compiles to `webapp/dist/server/`
- **Production**: Express serves the Vite build from `dist/client/` with SPA fallback. In dev, Vite on :5173 proxies `/api` to Express on :3001
- **Railway**: `railway.toml` runs `cd webapp && npm install && npm run build` then `cd webapp && node dist/server/index.js`. Health check at `/api/health`

### Server (`webapp/server/`)
- `index.ts` — Express 5 app: helmet, CORS, audit middleware, error handler, 22 API endpoints under `/api`
- `routes/auth.ts` — Legacy auth (login + me, 24h JWT)
- `routes/authV2.ts` — Enterprise auth: 15-min access tokens, refresh token rotation, account lockout after 5 failures, httpOnly cookie support
- `routes/cases.ts` — Case CRUD with Zod validation
- `routes/documents.ts` — File upload (multer) with MIME validation, PDF page count extraction
- `routes/agents.ts` — Agent trigger + SSE stream + human checkpoint (approve/revise/reject)
- `routes/reports.ts` — Report get/save/export (PDF via Puppeteer, DOCX via html-to-docx)
- `routes/organizations.ts` — Multi-tenant org CRUD, member management, usage reporting
- `services/agentRunner.ts` — Streams Claude API responses, parses structured JSON output per stage, broadcasts via SSE
- `services/promptLoader.ts` — Loads VOICE.md + ENTERPRISE_BRAIN.md + agent specs, assembles system prompts with stage-specific brain sections and output contracts
- `services/jobQueue.ts` — Dual-mode background job queue: in-process (dev) or BullMQ (production with REDIS_URL). Max concurrency 2, 5-min timeout per job.
- `services/documentProcessor.ts` — Extracts text content from PDFs/TXT/CSV, stores in Document.content for agent context injection. 100K char limit per document.
- `services/usageTracker.ts` — Per-organization AI cost metering. Tracks input/output tokens and calculates costCents by model pricing tier.
- `middleware/auth.ts` — JWT auth; supports Bearer header and query param (for EventSource/SSE). Extracts orgId from token.
- `middleware/audit.ts` — Request-level audit trail. Logs action, resource, userId, duration to structured logger + AuditLog table.
- `middleware/errorHandler.ts` — Centralized error handler for AppError hierarchy.
- `middleware/orgScope.ts` — Resolves organization context from X-Org-Id header or user's primary membership.
- `lib/logger.ts` — Structured JSON logger (production) / colored dev output. Log levels: debug < info < warn < error. Audit always writes.
- `lib/auth.ts` — Token utilities: generateAccessToken (15min JWT), generateRefreshToken (64-byte hex), hashToken (SHA-256), verifyAccessToken.
- `lib/errors.ts` — Error class hierarchy: AppError, NotFoundError, ValidationError, AuthenticationError, AuthorizationError, RateLimitError, ConflictError.
- `types/agentContracts.ts` — Per-stage typed output interfaces with validators and fallbacks
- `db.ts` — Prisma client singleton

### Frontend (`webapp/src/`)
- `App.tsx` — React Router: `/login`, `/dashboard`, `/cases/:id/{intake,research,drafting,qa,export}`
- `stores/` — Zustand: `authStore` (JWT in localStorage as `bb_token`), `caseStore` (CRUD), `agentStore` (SSE connection + agent trigger)
- `lib/api.ts` — Typed fetch wrapper for all endpoints + `createSSE()` for EventSource + typed result parsers
- `components/layout/` — AppShell, Header, Sidebar
- `components/shared/` — AgentActivityFeed, DraftEditor (TipTap), FileDropzone, HumanCheckpoint, StageNav, QADashboard, FindingsGrid, CitationCard, etc.

### Agent pipeline
Sequential: Intake -> Research -> Drafting -> QA. Each stage:
1. `promptLoader.ts` builds a system prompt from VOICE.md + relevant ENTERPRISE_BRAIN.md sections (mapped in `STAGE_BRAIN_REFS`) + the `agents/{stage}/BlackBar-{Stage}.md` spec (or hardcoded fallback)
2. `agentRunner.ts` streams Claude's response, broadcasting SSE events (`progress`, `finding`, `complete`, `error`, `qa_result`)
3. Agent must emit a trailing ```json block matching the stage's output contract (validated by `parseAgentOutput`)
4. Previous stage output is passed as context to the next stage via `getPreviousStageOutput`

### Data model (`webapp/prisma/schema.prisma`)
**Core**: User -> Case -> Document, AgentLog, Report. Cases track `stage` (intake/research/drafting/qa).
**Multi-tenancy**: Organization -> OrganizationMember -> User. Cases have optional orgId. Organization.entityType maps to LLC structure.
**Auth**: RefreshToken stores hashed tokens with expiry and revocation tracking.
**Observability**: AuditLog (indexed on [action, createdAt] and [userId, createdAt]), UsageRecord (indexed on [orgId, createdAt]).
**Versioning**: PromptVersion stores versioned snapshots of VOICE.md, ENTERPRISE_BRAIN.md, and agent specs with content hashes.
**Documents**: Document.content stores extracted text, extractionStatus tracks processing state (pending/processing/ready/failed).

## Testing
- Framework: Vitest with v8 coverage
- Tests: `webapp/server/__tests__/` — agentContracts (22 tests), agentRunner (14 tests), logger (24 tests)
- Run single test file: `npx vitest run server/__tests__/agentContracts.test.ts`
- Config: `webapp/vitest.config.ts` — globals enabled, node environment
- Test files are excluded from server build via `tsconfig.server.json`

## Key reference files (project root)
- `VOICE.md` — Lane's voice profile. Read-only during case runs. Never edit tone without approval.
- `ENTERPRISE_BRAIN.md` — 15-section domain knowledge (codes, attack patterns, adversaries, instruments)
- `PIPELINE.md` — Agent pipeline architecture spec
- `agents/{stage}/BlackBar-{Stage}.md` — Per-stage agent playbooks
- `BLACKBAR_UI_SPEC_v3.md` — Latest UI spec
- `ARCHITECTURE_AUDIT_v1.1.md` — Current architecture assessment

## Environment
- `.env` at **project root** (not webapp/) — `DATABASE_URL`, `JWT_SECRET`, `PORT`, `ANTHROPIC_API_KEY`
- Optional: `ALLOWED_ORIGINS` (comma-separated, required in production), `SUPERVISED_MODE=true`, `VOICE_MD_PATH`, `BRAIN_MD_PATH`, `AGENT_SPECS_DIR`
- Optional: `REDIS_URL` (enables BullMQ job queue instead of in-process queue)
- Optional: `LOG_LEVEL` (debug/info/warn/error, default: info)
- Express defaults to port 3001; Vite dev server proxies `/api` to it

## CI
- `.github/workflows/ci.yml` — On push to main/staging and PRs to main: `npm ci`, `tsc --noEmit`, `npm run build`, verify no `tsx` in start script, verify `railway.toml` uses compiled JS
- `.github/workflows/pr-check.yml` — On PRs to main/staging: `npm ci`, `tsc --noEmit`

## Deploy workflow
- All development pushes to `staging` first
- Verify on staging URL before merging to main
- Only `main` deploys to production
- NEVER push untested code directly to main

## Hard rules

- **NEVER** use `tsx` in the `start` script or any production command. Production runs `node dist/server/index.js`.
- **NEVER** change `webapp/package.json` `"start"` to anything other than `node dist/server/index.js`.
- **NEVER** add `tsx` as a production dependency. It belongs in `devDependencies` only.
- **NEVER** modify `schema.prisma` without creating a migration: `npm run db:migrate -- --name <description>`.
- **NEVER** overwrite `ENTERPRISE_BRAIN.md` without showing a diff preview first.
- **NEVER** edit `VOICE.md` tone, diction, or rhetorical patterns without explicit approval.
- **NEVER** commingle usage/cost data across organizations. Each entity's accounting is strictly separate.
- Prowl is dormant. Do not wire `prowl.ts`, `sentinel.ts`, or `pipelineMetrics.ts` into production routes until `runAgent` returns `AgentResult` and acceptance-rate data exists from 20+ real cases.
- All case facts are privileged. Never reference outside this project context.
- Do not create files in `Cases/` or `benchmarks/` without explicit request.
- Use `grep -E` not `grep -P` (macOS BSD grep compatibility).
