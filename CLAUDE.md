# BLACK-BAR — Project Config

## Problem
Forensic expert reports take too long to produce manually. BlackBar accelerates Lane Swainston's (father, forensic expert) report output using an AI-assisted pipeline that moves cases through 4 sequential stages — Intake → Research → Drafting → QA — with a single human checkpoint at the end before delivery.

## Architecture
Multi-agent pipeline webapp. Each stage has a dedicated AI agent spec. The webapp provides the UI for case management, document handling, and agent activity monitoring. Lane reviews the final QA output (one human checkpoint) before the report ships.

## Tech Stack
- Frontend: React 19 + TypeScript 5.9 + Vite 8 + Tailwind CSS 4
- Backend: Express 5 + TypeScript (tsx runtime)
- ORM: Prisma 6.19 (PostgreSQL on Railway)
- State: Zustand 5 + TanStack React Query 5
- Auth: bcrypt + JWT
- AI: Anthropic SDK 0.82
- Deploy: Railway (railway.toml at project root)
- All webapp code lives in `webapp/`

## Commands (run from webapp/)
| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite + Express concurrently |
| `npm run build` | TypeScript compile + Vite build |
| `npm run lint` | ESLint (flat config) |
| `npm run db:generate` | Prisma generate client |
| `npm run db:push` | Push schema to Railway PostgreSQL |
| `npm run db:seed` | Seed database |

## Directory Navigation
- `webapp/src/pages/` — Dashboard, CaseIntake, CaseResearch, CaseDrafting, CaseQA, CaseExport, Login
- `webapp/src/components/shared/` — AgentActivityFeed, BearMark, HumanCheckpoint, SkeletonLoader, StageNav, EmptyState
- `webapp/server/routes/` — API: auth, cases, documents, reports, agents
- `webapp/server/services/` — Business logic
- `webapp/prisma/schema.prisma` — DB schema
- `agents/` — Pipeline specs (Intake → Research → Drafting → QA)
- `Brand/` — Logo, "Forensic Noir" design philosophy
- `Cases/` — Privileged (never commit without explicit request)
- `reports/` — QA output from `.claude/skills/qa-pipeline/`

## Agent Pipeline
Sequential: Intake → Research → Drafting → QA
- Specs: `agents/{stage}/BlackBar-{Stage}.md`
- Voice: `VOICE.md` | Domain: `ENTERPRISE_BRAIN.md`
- QA skill: `.claude/skills/qa-pipeline/SKILL.md`

## Quick Reference
- `STATE.md` — **Current webapp state + 5-PR build sequence (read first on any UI task)**
- `DATABASE.md` — **Database runbook (migrations, seed, Railway mechanics, recovery)**
- `QUICKFIND.md` — "I need X → go to Y" lookup
- `DIRECTORY_MAP.md` — Full file inventory
- `ARCHITECTURE_AUDIT_v1.1.md` — Current arch assessment
- `BLACKBAR_UI_SPEC_v3.md` — Legacy UI spec (superseded by v2 design system below)

## Design System v2 — Forensic Noir × Dannaway Craft
Active 2026-04-16. Drives all new UI work.
- `Brand/DESIGN_TOKENS_v1.md` — canonical token spec
- `Brand/UI_REFERENCE_v1.html` — living reference (open in browser)
- `webapp/src/styles/tokens.css` — implemented CSS (additive layer, non-breaking)
- `webapp/src/styles/MIGRATION.md` — v1 → v2 token map
- `.claude/PERSONA_CHERNY_DANNAWAY.md` — system prompt that drives decisions

Core design rules: no glassmorphism as identity · no gradients · Inter Tight (not Inter) + Fraunces · no pure black/white · 8px rhythm · every surface has empty/loading/error states · `prefers-reduced-motion` honored · `[AGENT BLIND]` pill on any feature lacking agent reasoning. Migrate one component per PR.

## Environment
- .env at project ROOT (not webapp/) — DATABASE_URL, JWT_SECRET, SEED_LANE_PASSWORD, SEED_MARIZ_PASSWORD, ALLOWED_ORIGINS, ANTHROPIC_API_KEY, PORT
- Template: `webapp/.env.example` (tracked). Copy to `<root>/.env` and fill.
- Railway reads `railway.toml` for build/deploy. Migrations apply at container start, not build.
- Express on port 3001, Vite proxies /api.
- Node 22+ required (pinned via `.nvmrc` and `package.json` engines).

## Do NOT
- Use `grep -P` in scripts — macOS BSD grep, use `grep -E`
- Assume Prisma version — it is 6.19, check package.json
- cd into BLACK-BAR when user said Bloom Soft (or vice versa)
- Create files in Cases/ or benchmarks/ without explicit request

## HARD RULES — DO NOT VIOLATE

- **NEVER** use `tsx` in any `start` script or any production build command. Production runs compiled JS only.
- **NEVER** add `tsx` as a production dependency. It belongs in `devDependencies` only and is permitted only in `dev`/`dev:server`/`db:seed` style scripts that exist for local development.
- **Production `start` script must end in `node dist/server/index.js`.** Prefix commands like `prisma migrate deploy &&` are permitted (and expected — migrations apply at container start). If you change the `build` output layout, audit `start` to match.
- **NEVER modify `schema.prisma` without a migration.** Every schema change ships with `npm run db:migrate:new -- <name>` and commits the resulting `migrations/<timestamp>_<name>/` folder. See `DATABASE.md`.
- **NEVER `prisma db push` against production.** It bypasses migration history and causes drift. Use `db:migrate:deploy` (automatic via `railway.toml`) instead.
- Prowl is dormant. Do not wire prowl.ts, sentinel.ts, or pipelineMetrics.ts into production routes until runAgent returns AgentResult and acceptance-rate data exists from 20+ real cases.

## Deploy Workflow

**Current state — construction mode.** Webapp is deployed at `blackbar-scg-production.up.railway.app` but behind a Construction Zone banner; no real users yet. Lane will be told to log in when the site is ready.

**Flow:**
- Feature / fix branches → PR directly to `main`. Review → merge.
- No long-lived `staging` branch. A staging rail without a dedicated staging URL is ceremony, not protection, and invites merge drift.
- Local verification before push is mandatory: `cd webapp && npm run build && npm run lint` green.
- Use isolated `git worktree` when multiple Cowork / Claude Code sessions are active on this repo — never `git checkout` across branches in a shared worktree (global Operating Model rule).
- Railway auto-rebuilds on every push to `main`. Migrations apply automatically on container start. See `DATABASE.md`.

**Post-launch (when Lane goes live):**
- Enable Railway PR preview deployments. Every open PR gets an ephemeral preview URL.
- Lane verifies on the preview URL before merge.
- Optionally point a `staging` branch at a separate Railway staging service for a bookmarkable Lane URL. Feature branches still PR straight to `main`.

**Hard rules (all phases):**
- NEVER push untested code to `main`. Local build + lint green is the gate.
- Migration and `schema.prisma` rules live in HARD RULES above and in `DATABASE.md`.
