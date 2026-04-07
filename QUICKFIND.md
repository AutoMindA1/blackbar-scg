# BLACK-BAR Quick Find

> What do you need? → Go here.

| If I need... | Go to... | Key file(s) |
|---|---|---|
| **Architecture / system design** | `Docs/` or root | `PIPELINE.md`, `BlackBar_Architecture.html`, `blackbar-architecture-spec.html`, `Docs/blackbar-system-specification_v2.pdf` |
| **Voice and brand guidelines** | Root + `Brand/` | `VOICE.md`, `Brand/blackbar-design-philosophy.md`, `Brand/blackbar-brand-identity-package.html` |
| **Enterprise brain / domain knowledge** | Root | `ENTERPRISE_BRAIN.md` |
| **Agent pipeline specs** | `agents/` | `agents/intake/`, `agents/research/`, `agents/drafting/`, `agents/qa/` — one spec per agent |
| **Webapp source code** | `webapp/src/` | `webapp/src/App.tsx` (root), `webapp/src/pages/` (stage UIs), `webapp/server/` (API) |
| **Webapp backend / API routes** | `webapp/server/routes/` | `auth.ts`, `cases.ts`, `documents.ts`, `reports.ts`, `agents.ts` |
| **Database schema** | `webapp/prisma/` | `schema.prisma` |
| **Benchmark reports** | `benchmarks/` | Gleason, Heagy (rebuttal), Anderson (supplemental) — gold-standard QA references |
| **Case files (privileged)** | `Cases/` | `00-opposing-experts/`, `01-premises-liability/`, `02-design-and-construction/`, `03-photographic-video-analysis/` |
| **Opposing expert intel** | `Cases/00-opposing-experts/` | Subfolders by expert name (Jones, Elliott, Hjorth, Peterson, Perez, etc.) |
| **Slip test data** | `Cases/01-premises-liability/7. Slip Tests/` | Subfolders by venue and date |
| **Deployment / pipeline config** | Root | `railway.toml` (Railway deploy), `PIPELINE.md` (agent flow), `.env` (secrets) |
| **Session handoffs** | Root | `CLAUDE_CODE_HANDOFF.md`, `SESSION1_HANDOFF.md`, `2026-03-26_agent-team-pressure-test.md` |
| **Lender jurisdiction data (Mariz's tables)** | Root + `reference/` | `BRAIN_S8_CODE_ADOPTION_TABLES.md` (Mariz's tables), `reference/nevada-code-table.md` |
| **NV building codes by jurisdiction** | `reference/` + `Referenceable Construction Code Files/` | `reference/nevada-code-table.md` (lookup table), PDFs (official source docs) |
| **Credential verification** | `reference/` | `reference/credential-registry.md` |
| **Opposing expert cert status** | `reference/` | `reference/cxlt-fallback.md` |
| **Counter-argument playbook** | `reference/` | `reference/peterson-playbook.md` (John Peterson specifically) |
| **ADA / accessibility standards** | `reference/` | `reference/ada-edition-map.md` |
| **Tribometer / SCOF/DCOF thresholds** | `reference/` | `reference/nfsi-thresholds.md` |
| **Report boilerplate blocks** | `templates/` | `limitation-disclosure.md`, `contributory-negligence-gate.md` |
| **Case assignment workflow** | `Workflows/` | `SCG-Case-Assignment-Workflow-Official.docx`, `SCG-Workflow-to-BlackBar-Mapping.md` |
| **QA findings / blocking issues** | `reports/` | `2026-03-27_qa-report.md`, `reports/tier1-integration-gaps.md` |
| **Validation / automated checks** | `scripts/` | `scripts/validate.sh` |
| **Legal / NDA** | `Legal/` | `nda-swainston-consulting-group-techtide-final.pdf` |
| **Logo assets** | `Brand/` | `black-bar-logo-black.png`, `black-bar-logo-white.png`, `black-bar-logo-lane-swainston.png` |
| **GTM strategy** | Root | `blackbar-gtm-sprint-strategy.html`, `lane-responses-2026-03-28.md` |
| **Frontend spec** | Root or `Docs/` | `BLACKBAR_FRONTEND_SPEC.md` |
| **Implementation roadmap** | `Docs/` | `blackbar-implementation-roadmap_v2.pdf` |
