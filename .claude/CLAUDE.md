# BlackBar v1 — Project CLAUDE.md

## Project

SCG forensic rebuttal system. Repo: AutoMindA1/blackbar-scg. Local: `~/BLACK-BAR`.
Bear mascot. Accent: #FF6B35. 4 agents · real Anthropic SDK calls · typed JSON contracts · SSE streaming. Lane Swainston is primary user; Mariz Arellano is senior consultant.

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
STATE.md                                 — Current state of the webapp + 5-PR build sequence (read this first)
ENTERPRISE_BRAIN.md                      — 15-section domain knowledge (89% complete)
VOICE.md                                 — Lane's voice profile (DO NOT edit tone without approval)
PIPELINE.md                              — Agent pipeline spec
SESSION1_HANDOFF.md                      — Full build spec
CLAUDE_CODE_HANDOFF.md                   — Spec edit handoff
Docs/BlackBar_Architecture.html          — 10-tab interactive spec
Docs/BLACKBAR_FRONTEND_SPEC.md
BRAIN_S8_CODE_ADOPTION_TABLES.md         — Mariz's 4-jurisdiction tables (NOT YET MERGED)

Brand/DESIGN_TOKENS_v1.md                — v2 design system tokens (Forensic Noir × Dannaway)
Brand/UI_REFERENCE_v1.html               — living UI reference — open in browser
.claude/PERSONA_CHERNY_DANNAWAY.md       — Boris Cherny × Adham Dannaway system prompt (drives design decisions)
webapp/src/styles/tokens.css             — v2 tokens implemented as additive CSS layer
webapp/src/styles/MIGRATION.md           — v1 → v2 token migration map
```

## Deploy

Railway project: "airy-creativity". Postgres: **online**. Webapp: **NOT deployed**.

Next steps:
1. Connect GitHub repo as new Railway service
2. Set root directory to `webapp`
3. Add env vars: `DATABASE_URL` (internal), `JWT_SECRET`, `PORT`
4. Generate public domain

## Pending Work

- [x] Merge code adoption tables into ENTERPRISE_BRAIN.md Section 8 (done 2026-04-12 — adoption process, jurisdiction matrix, ADA enforcement architecture, reference file index)
- [x] Replace mocked SSE agents with real agent pipeline (done — 4 agents live via Anthropic SDK with typed JSON contracts)
- [ ] PR 1 — Notes as first-class capture (schema + route + NoteList + Intake agent integration)
- [ ] PR 2 — Image preview modal with `[AGENT BLIND]` flag
- [ ] PR 3 — Image content reasoning (OCR / Claude vision) — removes `[AGENT BLIND]`
- [ ] PR 4 — Unified capture surface (Dannaway pass on CaseIntake)
- [ ] PR 5 — Deploy webapp to Railway
- [ ] Package AISDLC Product Architect as `.skill` file
- [ ] Migrate components v1 → v2 tokens per `webapp/src/styles/MIGRATION.md`

## Rules

- Never overwrite ENTERPRISE_BRAIN.md without showing a diff preview first.
- VOICE.md is Lane's voice — never edit tone, diction, or rhetorical patterns without explicit approval.
- All case facts are privileged. Never reference outside this project context.
- Confirmation gate on any output that touches benchmark case analysis or expert report language.

## Design System — v2 (Forensic Noir × Dannaway Craft)

Active as of 2026-04-16. The Cherny × Dannaway persona at `.claude/PERSONA_CHERNY_DANNAWAY.md` drives UI decisions.

- **Canonical system:** `Brand/DESIGN_TOKENS_v1.md`
- **Living UI reference:** `Brand/UI_REFERENCE_v1.html` (open in browser — renders all 11 surfaces)
- **Implemented tokens:** `webapp/src/styles/tokens.css` (additive — does not break v1)
- **Migration map:** `webapp/src/styles/MIGRATION.md`

Design rules enforced at component-level:
- No glassmorphism / backdrop-filter as identity (retires `.glass`, `.glass-elevated`)
- No gradient anywhere
- No default Inter — use Inter Tight (body) + Fraunces (display)
- No pure `#000` or `#FFF`
- Every interactive element has visible focus ring
- Every new surface has empty state, loading state, error state
- `prefers-reduced-motion` respected on all animation
- Every AI feature that looks like it should trigger agent reasoning but doesn't — render inline `[AGENT BLIND]` pill
- 8px rhythm strict

Migrate one component per PR. Do NOT bulk-replace — DM Sans and Inter Tight have different metrics.

## Persona Routing

When making UI or architecture decisions on BlackBar, respond through the Cherny × Dannaway lens:
- `[CHERNY LENS]` — system/agent reasoning, trust surface, instrumentation
- `[DANNAWAY LENS]` — UI craft, spacing, motion, typography, empty states
- Emit hard-rule flags inline: `[SCHEMA CHANGE]`, `[AGENT BLIND]`, `[VOICE GUARD]`, `[BRAIN GUARD]`, `[PRIVILEGED]`, `[STALE DOC]`
- Increment floor: 1 migration + 1 route + 1 component cluster per PR max. Decompose further if needed.

See full persona spec: `.claude/PERSONA_CHERNY_DANNAWAY.md`.
