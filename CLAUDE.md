# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BlackBar is an AI-assisted forensic expert report drafting system for Swainston Consulting Group (SCG). It moves cases through a 4-stage sequential pipeline — Intake, Research, Drafting, QA — with one human checkpoint (Lane's review) before delivery. All webapp code lives in `webapp/`.

## Commands (run from `webapp/`)

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite + Express concurrently (frontend :5173, API :3001) |
| `npm run build` | `tsc -b` + `vite build` + `tsc -p tsconfig.server.json` |
| `npm run lint` | ESLint flat config (TS + React hooks + React Refresh) |
| `npm run db:generate` | Prisma generate client |
| `npm run db:push` | Push schema to PostgreSQL |
| `npm run db:seed` | Seed database via tsx |
| `npm run start` | `node dist/server/index.js` (production only) |

No test suite exists yet. CI runs `tsc --noEmit` and `npm run build` as the quality gate.

## Architecture

### Build pipeline
- **Frontend**: Vite builds to `webapp/dist/client/` (React 19 SPA)
- **Server**: `tsc -p tsconfig.server.json` compiles to `webapp/dist/server/`
- **Production**: Express serves the Vite build from `dist/client/` with SPA fallback. In dev, Vite on :5173 proxies `/api` to Express on :3001
- **Railway**: `railway.toml` runs `cd webapp && npm install && npm run build` then `cd webapp && node dist/server/index.js`. Health check at `/api/health`

### Server (`webapp/server/`)
- `index.ts` — Express 5 app: helmet, CORS, 14 API endpoints mounted under `/api`
- `routes/` — auth (login + me), cases (CRUD), documents (upload + list), agents (trigger + SSE stream + approve), reports (get + save + export)
- `services/agentRunner.ts` — Streams Claude API responses via Anthropic SDK, parses structured JSON output per stage, broadcasts via SSE
- `services/promptLoader.ts` — Loads `VOICE.md` + `ENTERPRISE_BRAIN.md` (from project root) + `agents/{stage}/BlackBar-{Stage}.md` specs, assembles system prompts with stage-specific brain sections and output contracts
- `middleware/auth.ts` — JWT auth; supports Bearer header and query param (for EventSource/SSE)
- `types/agentContracts.ts` — Per-stage typed output interfaces with validators and fallbacks
- `db.ts` — Prisma client singleton

### Frontend (`webapp/src/`)
- `App.tsx` — React Router: `/login`, `/dashboard`, `/cases/:id/{intake,research,drafting,qa,export}`
- `stores/` — Zustand: `authStore` (JWT in localStorage as `bb_token`), `caseStore` (CRUD), `agentStore` (SSE connection + agent trigger)
- `lib/api.ts` — Typed fetch wrapper for all 14 endpoints + `createSSE()` for EventSource + typed result parsers (`parseIntakeFromMetadata`, `parseResearchFromMetadata`, `parseDraftingFromMetadata`)
- `components/layout/` — AppShell, Header, Sidebar
- `components/shared/` — AgentActivityFeed, DraftEditor (TipTap), FileDropzone, HumanCheckpoint, StageNav, QADashboard, FindingsGrid, CitationCard, etc.
- `pages/` — Dashboard, CaseIntake, CaseResearch, CaseDrafting, CaseQA, CaseExport, Login, NotFound

### Agent pipeline
Sequential: Intake -> Research -> Drafting -> QA. Each stage:
1. `promptLoader.ts` builds a system prompt from VOICE.md + relevant ENTERPRISE_BRAIN.md sections (mapped in `STAGE_BRAIN_REFS`) + the `agents/{stage}/BlackBar-{Stage}.md` spec (or hardcoded fallback)
2. `agentRunner.ts` streams Claude's response, broadcasting SSE events (`progress`, `finding`, `complete`, `error`, `qa_result`)
3. Agent must emit a trailing ```json block matching the stage's output contract (validated by `parseAgentOutput`)
4. Previous stage output is passed as context to the next stage via `getPreviousStageOutput`

### Data model (`webapp/prisma/schema.prisma`)
User -> Case -> Document, AgentLog, Report. Cases track `stage` (intake/research/drafting/qa). AgentLog stores SSE events with JSON metadata. Report stores HTML content + sections.

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
- **NEVER** modify `schema.prisma` without creating a migration: `npx prisma migrate dev --name <description>`.
- **NEVER** overwrite `ENTERPRISE_BRAIN.md` without showing a diff preview first.
- **NEVER** edit `VOICE.md` tone, diction, or rhetorical patterns without explicit approval.
- Prowl is dormant. Do not wire `prowl.ts`, `sentinel.ts`, or `pipelineMetrics.ts` into production routes until `runAgent` returns `AgentResult` and acceptance-rate data exists from 20+ real cases.
- All case facts are privileged. Never reference outside this project context.
- Do not create files in `Cases/` or `benchmarks/` without explicit request.
- Use `grep -E` not `grep -P` (macOS BSD grep compatibility).
