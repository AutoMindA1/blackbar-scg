# BlackBar — Pipeline Architecture
## Sequential 4-Agent Drafting System for SCG Expert Reports

---

## OVERVIEW

```
Lane/Mariz
    │
    │  Raw case input (email, notes, docs)
    ▼
┌─────────────────────────────────────┐
│  AGENT 1: INTAKE                    │
│  agents/intake/AGENT.md             │
│  • Parses any input format          │
│  • Normalizes into Intake Brief     │
│  • Flags missing fields             │
│  • Generates Research Flags         │
│  OUTPUT → cases/[ID]/intake.md      │
└──────────────────┬──────────────────┘
                   │  intake.md (complete, no MISSING fields)
                   ▼
┌─────────────────────────────────────┐
│  AGENT 2: RESEARCH                  │
│  agents/research/AGENT.md           │
│  • Resolves all Research Flags      │
│  • Performs CXLT registry check     │
│  • Identifies code edition          │
│  • Activates Peterson Playbook      │
│  • Selects boilerplate blocks       │
│  • Builds Section Plan              │
│  OUTPUT → cases/[ID]/research.md    │
└──────────────────┬──────────────────┘
                   │  research.md (complete, section plan confirmed)
                   ▼
┌─────────────────────────────────────┐
│  AGENT 3: DRAFTING                  │
│  agents/drafting/AGENT.md           │
│  • Reads VOICE.md in full           │
│  • Reads selected benchmark PDF     │
│  • Drafts each section per plan     │
│  • Inserts verbatim boilerplate     │
│  • Placeholders for missing items   │
│  OUTPUT → cases/[ID]/draft.md       │
└──────────────────┬──────────────────┘
                   │  draft.md (complete with self-audit)
                   ▼
┌─────────────────────────────────────┐
│  AGENT 4: QA                        │
│  agents/qa/AGENT.md                 │
│  • 10-point audit against VOICE.md  │
│  • Benchmark comparison by section  │
│  • Fact-checks against intake       │
│  • Scores each section              │
│  • Produces priority fix list       │
│  OUTPUT → cases/[ID]/qa-report.md   │
└──────────────────┬──────────────────┘
                   │
                   ▼
         Lane/Mariz receive:
         • draft.md
         • qa-report.md
         • List of open placeholders
         • Priority fix list
```

---

## HANDOFF CONTRACTS

### Intake → Research
**Intake Agent produces:** `intake.md`
**Required before handoff:** Status line reads `INTAKE COMPLETE: YES`
**Blocked by:** Any field marked `[MISSING — needs input]`
**Trigger phrase:** `>> HANDOFF TO RESEARCH AGENT`

### Research → Drafting
**Research Agent produces:** `research.md`
**Required before handoff:** All Research Flags resolved OR marked `TBD — Drafting Agent to use placeholder`
**Trigger phrase:** `>> HANDOFF TO DRAFTING AGENT`

### Drafting → QA
**Drafting Agent produces:** `draft.md`
**Required before handoff:** All sections drafted (placeholders OK for missing facts; no empty sections)
**Trigger phrase:** `>> HANDOFF TO QA AGENT`

### QA → Lane/Mariz
**QA Agent produces:** `qa-report.md`
**Required before handoff:** All 10 checks completed
**Clean handoff trigger:** `>> READY FOR LANE/MARIZ`
**Escalation trigger:** `>> QA ESCALATION` (returns to Drafting Agent)

---

## CASE FOLDER STRUCTURE

Every case gets a dedicated folder under `/BLACK-BAR/cases/`:

```
BLACK-BAR/
  cases/
    [attorney-surname]-[plaintiff-surname]-[YYYY]/
      intake.md          ← Output of Intake Agent
      research.md        ← Output of Research Agent
      draft.md           ← Output of Drafting Agent
      qa-report.md       ← Output of QA Agent
      final/
        [report-name].md ← Lane-edited final version
```

**Case ID format:** `[attorney-surname]-[plaintiff-surname]-[YYYY]`
Examples: `carmona-gleason-2026`, `young-heagy-2026`, `carmona-anderson-2025`

---

## REFERENCE FILES (READ-ONLY — DO NOT MODIFY DURING A CASE RUN)

These files govern all agents. Never overwrite them during a case run.

```
BLACK-BAR/
  VOICE.md                              ← Voice, structure, boilerplate
  benchmarks/
    SCG Report - Gleason.pdf            ← Benchmark: Initial Report
    SCG Rebuttal Report - Heagy.pdf     ← Benchmark: Rebuttal Report
    SCG Supplemental Report - Anderson.pdf  ← Benchmark: Supplemental Report
  agents/
    intake/AGENT.md
    research/AGENT.md
    drafting/AGENT.md
    qa/AGENT.md
  PIPELINE.md                           ← This file
```

---

## BENCHMARK SELECTION GUIDE

| Report Type Requested | Use This Benchmark |
|-----------------------|-------------------|
| Initial Report | Gleason (2 Feb 2026) |
| Rebuttal Report | Heagy (23 Jan 2026) |
| Supplemental responding to Plaintiff Expert Rebuttal | Anderson (2 Dec 2025) |
| 1st/2nd Supplemental (new documents only) | Gleason (for structure) |
| 2nd Rebuttal | Heagy |

When in doubt: Gleason is the most complete and most recent. Default to Gleason unless the report type is clearly rebuttal or supplemental-to-rebuttal.

---

## UPDATING VOICE.md

VOICE.md should be updated after every new matter is filed, if the filed report contains:
- New boilerplate language not currently in VOICE.md
- A new credential, certification, or credential block
- A new analytical attack pattern
- A new section header or structural element
- A new recurring adversary pattern

**Update protocol:**
1. Lane or Mariz identifies the new language after filing
2. Caleb (system owner) adds it to the appropriate section of VOICE.md
3. Note the update date and source case at the bottom of VOICE.md

---

## KNOWN LIMITATIONS (as of Version 1.0)

- **Code edition lookups** — Research Agent cannot independently access Clark County or City of Las Vegas adoption records in real time. Code determination should be confirmed by Lane before Drafting Agent proceeds.
- **CXLT Registry** — Research Agent can access the public registry but may encounter access issues. If lookup fails, mark as `[PENDING REGISTRY CHECK]` and Lane confirms manually.
- **Photo/figure integration** — Draft output is text-only. All `[INSERT FIGURE N]` placeholders require the formatting layer (DOCX generation) to insert actual images. This is a Phase 3 / formatting workflow item.
- **Mariz's case-specific hospitality paragraph** — The template includes bracketed fields that require case-specific operational context. The Drafting Agent will populate from intake facts but Lane/Mariz should review Mariz's paragraph before filing.

---

*Pipeline v1.0 — Built 21 March 2026*
*Next version: Phase 3 — DOCX formatting layer and photo integration workflow*
