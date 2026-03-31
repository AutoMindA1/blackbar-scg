# BlackBar — PROJECT MAP
**Generated:** 27 March 2026
**Method:** 3-agent parallel codebase analysis (Structure × Components × Infrastructure)

---

## 1. STRUCTURE

### Project Type
Single-project, documentation-as-code pipeline. Not a monorepo. All components feed one output path: `cases/[attorney-surname]-[plaintiff-surname]-[YYYY]/`.

### Directory Tree

```
BLACK-BAR/                                    ← Project root (single git repo)
│
├── PIPELINE.md                               ← Pipeline architecture + handoff contracts
├── VOICE.md                                  ← Master voice spec (35.6 KB, 20 sections)
├── README.md                                 ← Project overview + phase status
├── index.html                                ← Project dashboard (GitHub Pages)
├── BlackBar_Architecture.html                ← Architecture diagram
├── BlackBar_For_Lane.html                    ← Lane status briefing
├── 2026-03-26_agent-team-pressure-test.md    ← Pre-prod QA (43.4 KB, 46 findings)
├── push-to-github.sh                         ← One-time deploy script
├── .gitignore                                ← Excludes Cases/, benchmarks/
│
├── agents/                                   ← 4-AGENT PIPELINE SPECS
│   ├── intake/BlackBar-Intake.md             ← Agent 1: Input normalization → intake.md
│   ├── research/BlackBar-Research.md         ← Agent 2: Flag resolution → research.md
│   ├── drafting/BlackBar-Drafting.md         ← Agent 3: Report generation → draft.md
│   └── qa/BlackBar-QA.md                     ← Agent 4: 10-point audit → qa-report.md
│
├── reference/                                ← VERIFIED GROUND-TRUTH LOOKUPS (stubs)
│   ├── nevada-code-table.md                  ← Jurisdiction × code edition × effective date
│   ├── nfsi-thresholds.md                    ← DCOF/SCOF values with source citations
│   ├── ada-edition-map.md                    ← A117.1 edition → IBC mapping
│   ├── credential-registry.md                ← Lane/Mariz cert verification status
│   ├── cxlt-fallback.md                      ← Offline CXLT snapshot
│   └── peterson-playbook.md                  ← Recurring adversary counter-arguments
│
├── templates/                                ← VERBATIM INSERTION BLOCKS
│   ├── limitation-disclosure.md              ← Surface remediation caveat
│   └── contributory-negligence-gate.md       ← Conditional Block 7 (counsel auth gate)
│
├── benchmarks/                               ← QA CALIBRATION (3 PDFs, 2.2 MB)
│   ├── SCG Report - Gleason.pdf              ← Initial Report archetype (Feb 2026)
│   ├── SCG Rebuttal Report - Heagy.pdf       ← Rebuttal archetype (Jan 2026)
│   └── SCG Supplemental Report - Anderson.pdf ← Supplemental archetype (Dec 2025)
│
├── Cases/                                    ← CASE ARCHIVE (~16 GB, git-excluded)
│   ├── 00-opposing-experts/                  ← 11+ adversary profiles (Jones, Elliott, Peterson…)
│   ├── 01-premises-liability 2/              ← 50+ filed reports by incident type
│   │   ├── 1. Slips/
│   │   ├── 2. Trips, Missteps/
│   │   ├── 3. Stairs, Curbs, Elevations/
│   │   ├── 4. ADA / ICC A117 Accessibility/
│   │   ├── 7. Slip Tests/                    ← Field test data (MGM, Excalibur, NYNY…)
│   │   ├── 11. Falls/                        ← 20+ fall reports
│   │   └── [8 more sub-categories]
│   ├── 02-design-and-construction/           ← Contract, OSHA, code, pool/spa cases
│   └── 03-photographic-video-analysis/       ← Surveillance, aerial imagery
│
├── Docs/                                     ← SYSTEM DOCUMENTATION
│   ├── blackbar.docx                         ← Original system guide
│   ├── blackbar-system-specification_v2.*    ← Full spec (PDF + DOCX)
│   ├── blackbar-implementation-roadmap_v2.*  ← Phase roadmap (PDF + DOCX)
│   └── blackbar-architecture-diagram.html
│
├── Workflows/                                ← OPERATIONAL SOPs
│   ├── readme.md                             ← Stub (placeholder content)
│   ├── new-case-workflow-scg.docx            ← New case intake SOP
│   └── outline-case-assignment-workflow.docx ← Case assignment flow
│
├── Brand/                                    ← BRAND ASSETS (~14 MB)
│   ├── black-bar-logo-*.png                  ← Logo variants
│   ├── blackbar-design-philosophy.md         ← "Forensic Noir" visual system
│   ├── blackbar-brand-identity-package.html  ← Full brand package
│   └── blackbar-identity-canvas.pdf          ← Identity framework
│
├── Legal/
│   └── nda-swainston-consulting-group-techtide-final.pdf
│
├── Media/                                    ← Case photos, diagrams (~18 MB)
│
├── reports/                                  ← GENERATED QA OUTPUTS
│   ├── qa-review.md                          ← 3-agent QA review (27 Mar 2026)
│   └── PROJECT_MAP.md                        ← This file
│
└── .claude/skills/qa-pipeline/SKILL.md       ← Reusable QA pipeline skill
```

---

## 2. COMPONENTS

### Pipeline Data Flow

```
Raw Input (attorney email/notes/docs)
    ↓
INTAKE AGENT → cases/[ID]/intake.md
    ↓ [INTAKE COMPLETE: YES]
RESEARCH AGENT → cases/[ID]/research.md
    ↓ [>> HANDOFF TO DRAFTING AGENT]
    │  reads: intake.md + VOICE.md + benchmarks/ + reference/
DRAFTING AGENT → cases/[ID]/draft.md
    ↓ [>> HANDOFF TO QA AGENT]
    │  reads: intake.md + research.md + VOICE.md + benchmarks/
QA AGENT → cases/[ID]/qa-report.md
    ↓ [>> READY FOR LANE/MARIZ] or [>> QA ESCALATION]
Lane/Mariz → cases/[ID]/final/[report-name].md
```

### Component Status Matrix

| Component | Type | Status | Completeness | Dependencies |
|-----------|------|--------|--------------|--------------|
| PIPELINE.md | Architecture | Active | Complete | — |
| VOICE.md | Voice Standard | Active | Complete (gaps in §19: ADA, stair, fire) | — |
| BlackBar-Intake.md | Agent Spec | Active | Complete (15 Tier 1 fixes pending) | — |
| BlackBar-Research.md | Agent Spec | Active | Complete (code table, ADA, gate pending) | intake.md, VOICE.md, reference/ |
| BlackBar-Drafting.md | Agent Spec | Active | Complete (NEVER USE, Block 7, disclosure pending) | research.md, VOICE.md, benchmarks/ |
| BlackBar-QA.md | Agent Spec | Active | Complete (Checks 11–12, threshold, benchmark verify pending) | draft.md, intake.md, VOICE.md, benchmarks/ |
| nevada-code-table.md | Reference | **Stub** | Skeleton — Lane must populate | Clark County Dev Services records |
| nfsi-thresholds.md | Reference | **Stub** | Skeleton — needs source page refs | NFSI B101.1/B101.3 source docs |
| ada-edition-map.md | Reference | **Stub** | Skeleton — needs CBO verification | ICC adoption records |
| credential-registry.md | Reference | **Stub** | Skeleton — Lane must verify | Issuing bodies |
| cxlt-fallback.md | Reference | **Stub** | Skeleton — needs snapshot data | excelatribometers.com |
| peterson-playbook.md | Reference | **Stub** | Skeleton — Lane must populate | Prior case history |
| limitation-disclosure.md | Template | Active | Partial — verbatim text ready, insertion rules defined | Research Brief trigger |
| contributory-negligence-gate.md | Template | Active | Partial — gate logic defined, Block 7 text placeholder | Counsel authorization |
| Gleason.pdf | Benchmark | Active | Complete | — |
| Heagy.pdf | Benchmark | Active | Complete | — |
| Anderson.pdf | Benchmark | Active | Complete | — |

### Key Dependency: VOICE.md

VOICE.md is the single most critical file — referenced by all 4 agents. It governs voice rules, boilerplate blocks (11 blocks), terminology (ALWAYS USE / NEVER USE), credential blocks, code citation methodology, benchmark selection, and adversary playbooks. Changes to VOICE.md affect every pipeline output.

---

## 3. TESTING INFRASTRUCTURE

### Test Coverage: 0%

| Dimension | Exists? | Details |
|-----------|---------|---------|
| Unit tests | ❌ | No test framework configured |
| Integration tests | ❌ | No handoff contract validation |
| E2E tests | ❌ | No full pipeline run automation |
| CI/CD | ❌ | No GitHub Actions, CircleCI, or equivalent |
| Build scripts | ⚠️ | `push-to-github.sh` — one-time deploy, no validation |
| Regression tests | ❌ | Pressure test findings not automated |
| Benchmark verification | ❌ | No automated PDF load check |

### Quality Systems (Manual Only)

| System | What It Does | Automated? |
|--------|-------------|-----------|
| QA Agent (Agent 4) | 10-point audit of each draft | No — runs per-case, manually triggered |
| QA Pipeline Skill | 3-agent parallel review of pipeline itself | No — manually triggered |
| Pressure Test | Pre-production system audit | No — one-time event (26 Mar 2026) |
| Benchmark comparison | Voice calibration against filed reports | No — QA Check 9, subjective |
| Lane review | Human expert review of every output | Yes (by design) — but no tracking |

### Git State

- 3 commits on `main`, no branches
- Remote: `github.com/AutoMindA1/blackbar-scg`
- Force-push deployment (no branch protection)
- `.gitignore` excludes `Cases/` and `benchmarks/` (confidential)

### Pressure Test Integration: 0/15 Tier 1 Fixes Implemented

All 15 Tier 1 blocking issues from the 26 March pressure test remain unimplemented in the agent specs.

---

## 4. THREE HIGHEST-RISK AREAS

### RISK 1: Reference Files Are Empty — Pipeline Has No Ground Truth
**Severity:** 🔴 BLOCKING
**Confidence:** HIGH (95%)

Six `reference/` files are skeleton stubs with no data. The Research Agent needs verified Nevada code adoption dates, NFSI thresholds, ADA edition mappings, and credential status to produce accurate output. Without these, every code citation, standard threshold, and credential statement is sourced from AI training data — not verified records.

**Impact:** Every report produced before these files are populated contains impeachable citations. Opposing counsel can challenge code edition, threshold value, or credential validity at deposition. This is not a quality issue — it's an admissibility issue.

**Remediation:** Lane populates `nevada-code-table.md` and `nfsi-thresholds.md` from source documents (Clark County Dev Services, NFSI standards). All other stubs can be populated incrementally. **This blocks the entire Tier 1 fix chain** — Research Agent fixes depend on these files existing.

---

### RISK 2: Handoff Gates Are Documented But Not Enforced
**Severity:** 🔴 BLOCKING
**Confidence:** HIGH (92%)

PIPELINE.md defines four handoff contracts with preconditions (e.g., `INTAKE COMPLETE: YES`). No agent spec enforces these preconditions. The Intake Agent can mark a case complete while critical fields are `[MISSING]`. The Research Agent can hand off with unresolved code citations and incomplete CXLT lookups. The QA Agent's escalation threshold (>5 issues) is too permissive — pressure test says >3.

**Impact:** Errors cascade. An incomplete intake produces a wrong code citation in research, which becomes a wrong code citation in the draft, which the QA Agent's fact-check passes because it compares draft against intake (both wrong). Lane receives a report that passed all QA checks but contains a factual error in the foundation of the opinion.

**Remediation:** Define mandatory fields for each handoff gate. Add BLOCKING vs. NON-BLOCKING categorization to open items. Add a HANDOFF GATE template to Research Agent (5 required fields). Lower QA escalation threshold. Sequence: Intake gates first, then Research, then QA.

---

### RISK 3: Zero Automated Testing + Zero CI/CD = Silent Regression
**Severity:** ⚠️ MAJOR (operational risk, not case-level)
**Confidence:** HIGH (96%)

There are no automated tests, no CI/CD pipeline, no pre-push validation, and no regression suite. VOICE.md changes propagate silently. Agent spec updates have no changelog. The deploy script force-pushes to `main` with no branch protection. The pressure test identified 46 findings — none have been converted to automated checks.

**Impact at current scale:** Low. Lane reviews every output manually. Errors are caught in human review.

**Impact at target scale:** High. When Lane and Mariz run cases independently (Phase 5), there is no system-level validation that agent prompts haven't drifted, VOICE.md hasn't been corrupted, or benchmarks haven't been replaced. A single bad VOICE.md edit silently degrades every report produced until someone notices.

**Remediation:** Convert pressure test Tier 1 findings into executable validation checks (a "pipeline health" script that verifies: mandatory fields defined, VOICE.md sections present, NEVER USE terms listed, benchmark PDFs loadable, reference files non-empty). This doesn't require a full CI/CD system — a single validation script run before each case is sufficient for Phase 3.

---

*Generated by 3-agent parallel analysis: Structure Mapper × Component Analyst × Infrastructure Auditor*
