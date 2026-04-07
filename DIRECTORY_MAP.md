# BLACK-BAR Directory Map

> Swainston Consulting Group / BlackBar — AI-assisted forensic expert report pipeline
> Last updated: 2026-04-01

---

## Root — System Definition & Architecture

### Config
| File | What it is |
|------|-----------|
| `.gitignore` | Excludes Cases/, benchmarks/, .env, node_modules/, dist/ |
| `.env` | Environment secrets (gitignored) |
| `railway.toml` | Railway.app deploy config (builds webapp, runs Express) |
| `push-to-github.sh` | One-time GitHub push script |

### Core System Docs
| File | What it is |
|------|-----------|
| `VOICE.md` | Lane Swainston master voice profile — governs all agent output |
| `ENTERPRISE_BRAIN.md` | Domain knowledge layer — feeds every agent's OODA Orient step |
| `PIPELINE.md` | 4-agent sequential flow, handoff contracts, case folder spec |
| `BLACKBAR_FRONTEND_SPEC.md` | Frontend webapp architecture spec (React/TS/Vite/Express/SQLite) |
| `README.md` | Project overview and repo structure |

### Architecture & Strategy
| File | What it is |
|------|-----------|
| `BlackBar_Architecture.html` | Interactive architecture diagram |
| `blackbar-architecture-spec.html` | Detailed architecture specification |
| `blackbar-gtm-sprint-strategy.html` | Go-to-market sprint strategy |
| `BlackBar_For_Lane.html` | Status briefing page for Lane |
| `index.html` | Project dashboard landing page (dark theme, brass accents) |

### Session & Handoff
| File | What it is |
|------|-----------|
| `CLAUDE_CODE_HANDOFF.md` | Handoff doc for Claude Code continuation work |
| `SESSION1_HANDOFF.md` | Session 1 handoff notes |
| `2026-03-26_agent-team-pressure-test.md` | Pre-production QA pressure test (46 findings) |
| `lane-responses-2026-03-28.md` | Lane's responses to GTM sprint form |
| `BRAIN_S8_CODE_ADOPTION_TABLES.md` | Mariz's jurisdiction code adoption tables |

### Other
| File | What it is |
|------|-----------|
| `blackbar-hero.png` | Hero image (bear mascot) |
| `blackbar-scg.zip` | Compressed project archive |

---

## `agents/` — 4-Agent Pipeline Specs

Sequential pipeline: **Intake → Research → Drafting → QA**

```
agents/
├── intake/
│   └── BlackBar-Intake.md      # Agent 1: Raw input → structured Intake Brief
├── research/
│   └── BlackBar-Research.md    # Agent 2: Intake Brief → Research Brief (codes, flags, ammo)
├── drafting/
│   └── BlackBar-Drafting.md    # Agent 3: Research Brief → full report draft in Lane's voice
└── qa/
    └── BlackBar-QA.md          # Agent 4: Draft → QA audit against VOICE.md & benchmarks
```

---

## `Brand/` — Identity & Design Assets

| File | What it is |
|------|-----------|
| `blackbar-design-philosophy.md` | Visual philosophy ("Forensic Noir") — palette, composition rules |
| `blackbar-brand-identity-package.html` | Complete brand guidelines |
| `blackbar-identity-canvas.pdf` | Brand identity canvas |
| `black-bar-logo-black.png` | Logo — black on transparent |
| `black-bar-logo-white.png` | Logo — white on transparent |
| `black-bar-logo-lane-swainston.png` | Logo with Lane headshot |
| `black-bar-lane-swainston-headshot.png` | Lane headshot standalone |
| `black-bar-controlled-demolition.png` | Brand imagery — "controlled demolition" |
| `black-bar-redact-the-noise.png` | Brand imagery — "redact the noise" |
| `black-bar-tactical-firepower.png` | Brand imagery — "tactical firepower" |
| `blackbar-hero.png` | Hero image (bear with scales) |

---

## `Docs/` — Specifications & Roadmaps

| File | What it is |
|------|-----------|
| `BlackBar_Architecture.html` | Architecture diagram (copy of root) |
| `BLACKBAR_FRONTEND_SPEC.md` | Frontend spec (copy of root) |
| `blackbar-architecture-diagram.html` | Interactive architecture diagram |
| `blackbar-implementation-roadmap_v2.docx` | Implementation roadmap v2 (Word) |
| `blackbar-implementation-roadmap_v2.pdf` | Implementation roadmap v2 (PDF) |
| `blackbar-system-specification_v2.docx` | System specification v2 (Word) |
| `blackbar-system-specification_v2.pdf` | System specification v2 (PDF) |
| `blackbar.docx` | General project documentation |

---

## `Legal/` — Legal Documents

| File | What it is |
|------|-----------|
| `nda-swainston-consulting-group-techtide-final.pdf` | NDA — SCG ↔ TechTide (signed) |

---

## `Media/` — Generated Assets

| File | What it is |
|------|-----------|
| `gemini-generated-image-1.png` | AI-generated design exploration |
| `gemini-generated-image-2.png` | AI-generated design exploration |
| `gemini-generated-image-3.png` | AI-generated design exploration |

---

## `reference/` — Lookup Tables & Domain Knowledge

Operational reference files consumed by agents at runtime.

| File | What it is |
|------|-----------|
| `credential-registry.md` | Master credential verification (Lane & Mariz licenses, certs, expirations) |
| `nevada-code-table.md` | NV building code adoption by jurisdiction → applicable code edition |
| `ada-edition-map.md` | ADA / A117.1 edition mapping and trigger logic |
| `nfsi-thresholds.md` | NFSI B101.1/B101.3 tribometer thresholds (wet SCOF/DCOF) |
| `cxlt-fallback.md` | CXLT registry offline fallback (opposing expert cert status snapshot) |
| `peterson-playbook.md` | Counter-argument reference for recurring opponent John Peterson |

---

## `Referenceable Construction Code Files/` — Official Jurisdiction Records

| File | What it is |
|------|-----------|
| `City of Henderson - List of Adopted Codes.pdf` | Henderson official code adoption |
| `City of North Las Vegas code adoption[16295].pdf` | North Las Vegas code adoption |
| `City-of-Las-Vegas-Code-Adoption-Historical-Information.pdf` | Las Vegas historical code adoption |
| `Code Adoption Dates CLARK COUNTY.pdf` | Clark County code adoption dates |

---

## `Workflows/` — Process Documentation

| File | What it is |
|------|-----------|
| `readme.md` | Directory overview |
| `SCG-Workflow-to-BlackBar-Mapping.md` | Maps Lane's workflow → BlackBar agent improvements |
| `SCG-Case-Assignment-Workflow-Official.docx` | Official SCG case assignment workflow |
| `new-case-workflow-scg.docx` | Variant case workflow |
| `outline-case-assignment-workflow.docx` | Workflow outline |

---

## `templates/` — Conditional Report Blocks

Boilerplate blocks selected and inserted by agents based on case characteristics.

| File | What it is |
|------|-----------|
| `limitation-disclosure.md` | FRE 407 / NRS 48.135 block — post-remediation inspection disclosure |
| `contributory-negligence-gate.md` | Block 7 gate — distracted walking / contributory negligence (default YES) |

---

## `reports/` — Project Analysis & QA

| File | What it is |
|------|-----------|
| `PROJECT_MAP.md` | Project structure map (27 Mar 2026) |
| `2026-03-27_qa-report.md` | Multi-agent QA audit (46 findings: 19 blocking) |
| `tier1-integration-gaps.md` | 15 blocking fixes → agent prompt insertion points |
| `qa-review.md` | General QA review |
| `lane-populate-checklist.md` | Checklist for populating reference tables |
| `validate-log.txt` | Validation script output log |

---

## `scripts/` — Automation

| File | What it is |
|------|-----------|
| `validate.sh` | Checks placeholders, markdown syntax, UTF-8 traps, intake completeness |

---

## `webapp/` — Full-Stack Application (React + Express + Prisma)

```
webapp/
├── index.html                  # Vite HTML entry
├── package.json                # Dependencies
├── vite.config.ts              # Build config
├── eslint.config.js            # Linting
├── tsconfig*.json              # TypeScript configs (app, node, base)
│
├── prisma/
│   ├── schema.prisma           # DB schema (Users, Cases, Docs, Agents, Reports, Audit)
│   └── seed.ts                 # DB seed script
│
├── server/
│   ├── index.ts                # Express entry point
│   ├── db.ts                   # Database connection
│   ├── seed.ts                 # Server seed script
│   ├── middleware/
│   │   └── auth.ts             # JWT/session auth middleware
│   └── routes/
│       ├── auth.ts             # Login, logout, register
│       ├── cases.ts            # Case CRUD
│       ├── documents.ts        # Document upload/retrieval
│       ├── reports.ts          # Report generation/export
│       └── agents.ts           # Agent operation endpoints
│
├── src/
│   ├── main.tsx                # React entry
│   ├── App.tsx                 # Root component
│   ├── index.css               # Global styles
│   ├── lib/
│   │   └── api.ts              # API client (React Query hooks)
│   ├── stores/
│   │   ├── authStore.ts        # Zustand auth state
│   │   ├── caseStore.ts        # Case state
│   │   └── agentStore.ts       # Agent activity state
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx    # Main layout wrapper
│   │   │   ├── Header.tsx      # Navigation header
│   │   │   └── Sidebar.tsx     # Side nav
│   │   └── shared/
│   │       ├── AgentActivityFeed.tsx  # Live agent status
│   │       ├── HumanCheckpoint.tsx    # Approval/review gate
│   │       └── StageNav.tsx           # Pipeline stage nav
│   ├── pages/
│   │   ├── Login.tsx           # Auth page
│   │   ├── Dashboard.tsx       # Case list / status
│   │   ├── CaseIntake.tsx      # Stage 1: raw input
│   │   ├── CaseResearch.tsx    # Stage 2: flag resolution
│   │   ├── CaseDrafting.tsx    # Stage 3: draft generation
│   │   ├── CaseQA.tsx          # Stage 4: audit findings
│   │   └── CaseExport.tsx      # Report export/download
│   └── assets/
│       ├── hero.png            # Bear with scales
│       ├── react.svg           # React logo
│       └── vite.svg            # Vite logo
│
├── check_cases.ts              # Case checking test
├── test_api.ts                 # API integration tests
└── test_report.ts              # Report generation tests
```

---

## `Cases/` — Privileged Case Files (gitignored, local-only)

~1,405 files, ~16 GB. See `Cases/README.md` for full structure.

```
Cases/
├── README.md                       # Structure overview
├── 00-opposing-experts/            # 188 files — expert reports, CVs, fee schedules
├── 01-premises-liability/          # 996 files — slip/trip/fall, ADA, codes, fire, vehicles
├── 02-design-and-construction/     # 168 files — contracts, OSHA, codes, estimating, residential
└── 03-photographic-video-analysis/ # 9 files — surveillance, incident imagery, aerial
```

---

## `benchmarks/` — Benchmark Reports (gitignored, local-only)

Gold-standard reports that QA Agent audits drafts against.

| File | What it is |
|------|-----------|
| `SCG Report - Gleason.pdf` | Benchmark report — Gleason (1.2 MB) |
| `SCG Rebuttal Report - Heagy.pdf` | Benchmark rebuttal — Heagy (381 KB) |
| `SCG Supplemental Report - Anderson.pdf` | Benchmark supplemental — Anderson (525 KB) |
