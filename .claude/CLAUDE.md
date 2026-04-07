# BlackBar v1 — Project CLAUDE.md

## Project

SCG forensic rebuttal system. Repo: AutoMindA1/blackbar-scg. Local: `~/BLACK-BAR`.
Bear mascot. Accent: #FF6B35. 4 agents (mocked SSE). Lane Swainston is primary user; Mariz Arellano is senior consultant.

## Stack

- **Frontend:** Vite + React + TypeScript
- **Backend:** Express + Prisma + PostgreSQL
- **Structure:** `webapp/` is deployable root (8 pages, 14 endpoints)
- **Benchmark cases:** Gleason (trip_fall, Initial), Heagy (Peterson adversary, Rebuttal), Anderson (ANSI A326.3, Supplemental)

## Auth

```
lane@swainstonconsulting.com / savage-wins-2026
```

## Key Files

```
ENTERPRISE_BRAIN.md          — 15-section domain knowledge (89% complete)
VOICE.md                     — Lane's voice profile (DO NOT edit tone without approval)
PIPELINE.md                  — Agent pipeline spec
SESSION1_HANDOFF.md          — Full build spec
CLAUDE_CODE_HANDOFF.md       — Spec edit handoff
Docs/BlackBar_Architecture.html — 10-tab interactive spec
Docs/BLACKBAR_FRONTEND_SPEC.md
BRAIN_S8_CODE_ADOPTION_TABLES.md — Mariz's 4-jurisdiction tables (NOT YET MERGED)
```

## Deploy

Railway project: "airy-creativity". Postgres: **online**. Webapp: **NOT deployed**.

Next steps:
1. Connect GitHub repo as new Railway service
2. Set root directory to `webapp`
3. Add env vars: `DATABASE_URL` (internal), `JWT_SECRET`, `PORT`
4. Generate public domain

## Pending Work

- [ ] Merge `BRAIN_S8_CODE_ADOPTION_TABLES.md` into ENTERPRISE_BRAIN.md Section 8
- [ ] Package AISDLC Product Architect as `.skill` file
- [ ] Deploy webapp to Railway
- [ ] Replace mocked SSE agents with real agent pipeline

## Rules

- Never overwrite ENTERPRISE_BRAIN.md without showing a diff preview first.
- VOICE.md is Lane's voice — never edit tone, diction, or rhetorical patterns without explicit approval.
- All case facts are privileged. Never reference outside this project context.
- Confirmation gate on any output that touches benchmark case analysis or expert report language.
