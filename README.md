# BlackBar
## AI-Assisted Expert Report Drafting System
### Swainston Consulting Group (SCG) — Lane Swainston, CBO, CXLT, TCDS

**System Owner:** Caleb Swainston
**Built:** March 2026
**Status:** Phase 3 — First Live Test

---

## What This Is

BlackBar is a sequential 4-agent AI drafting system purpose-built for SCG expert reports in premises liability litigation. It takes raw case inputs — emails, notes, intake sheets, opposing reports — and produces a fully structured, voice-compliant expert report draft ready for Lane's review.

The system encodes Lane's voice, structural patterns, boilerplate language, credential blocks, and analytical attack strategies into a machine-readable profile (`VOICE.md`) that governs every agent in the pipeline.

---

## Repository Structure

```
BLACK-BAR/
├── README.md                        ← This file
├── VOICE.md                         ← Master voice + behavioral profile (v2.0)
├── PIPELINE.md                      ← Architecture, handoff contracts, case folder spec
│
├── agents/
│   ├── intake/AGENT.md              ← Agent 1: Normalizes raw input → intake.md
│   ├── research/AGENT.md            ← Agent 2: Resolves flags → research.md
│   ├── drafting/AGENT.md            ← Agent 3: Generates full draft → draft.md
│   └── qa/AGENT.md                  ← Agent 4: 10-point audit → qa-report.md
│
├── benchmarks/
│   ├── SCG Report - Gleason.pdf             ← Benchmark: Initial Report (2 Feb 2026)
│   ├── SCG Rebuttal Report - Heagy.pdf      ← Benchmark: Rebuttal Report (23 Jan 2026)
│   └── SCG Supplemental Report - Anderson.pdf  ← Benchmark: Supplemental (2 Dec 2025)
│
├── cases/
│   └── [attorney-surname]-[plaintiff-surname]-[YYYY]/
│       ├── intake.md
│       ├── research.md
│       ├── draft.md
│       ├── qa-report.md
│       └── final/
│
└── BlackBar_For_Lane.html           ← Project status briefing for Lane
```

---

## The Pipeline

```
Raw Input (email, notes, docs)
        │
        ▼
  AGENT 1: INTAKE
  Normalizes any input format into a structured Intake Brief.
  Flags missing fields. Generates Research Flags.
  Output: cases/[ID]/intake.md
        │
        ▼
  AGENT 2: RESEARCH
  Resolves all Research Flags: code edition, CXLT registry,
  Peterson Playbook, footwear, surveillance, prior matters.
  Selects boilerplate blocks. Builds Section Plan.
  Output: cases/[ID]/research.md
        │
        ▼
  AGENT 3: DRAFTING
  Reads VOICE.md in full. Reads benchmark PDF.
  Drafts every section per plan. Inserts verbatim boilerplate.
  Placeholders for missing facts.
  Output: cases/[ID]/draft.md
        │
        ▼
  AGENT 4: QA
  10-point audit against VOICE.md.
  Benchmark comparison by section. Fact-check against intake.
  Output: cases/[ID]/qa-report.md
        │
        ▼
  Lane / Mariz receive: draft.md + qa-report.md
```

Each agent hands off via a typed trigger phrase (e.g., `>> HANDOFF TO RESEARCH AGENT`). No agent proceeds until the prior stage is complete and verified.

---

## Key Reference Files

### VOICE.md (v2.0)
The behavioral constitution of the system. 20 sections covering:

- Identity & attribution rules (SCG voice, never "I" in body text)
- Date format (European — `15 April 2024`)
- Case naming convention (`Defendant adv Plaintiff`)
- Section structure and ordering
- Lane's full credentials block (verbatim)
- Boilerplate blocks 1–11 (verbatim — must not be paraphrased)
- ANSI A326.3 / BOT-3000E / DCOF testing methodology
- NFSI B101.1 and B101.3 thresholds
- Adversary playbook: John Peterson / Retail Litigation Consultants
- 10 analytical attack patterns
- Conclusion boilerplate (verbatim)
- Sign-off block: Lane Swainston CBO, CXLT, TCDS + Mariz Arellano CXLT / Senior Consultant
- Benchmark case registry
- Known gaps and open items

> **Rule:** VOICE.md is read-only during a case run. Never update it mid-pipeline.

### Benchmarks
Three filed, signed SCG reports used as QA calibration standards:

| File | Type | Date |
|------|------|------|
| SCG Report - Gleason.pdf | Initial Report | 2 Feb 2026 |
| SCG Rebuttal Report - Heagy.pdf | Rebuttal Report | 23 Jan 2026 |
| SCG Supplemental Report - Anderson.pdf | Supplemental Report | 2 Dec 2025 |

The QA Agent compares every new draft against the appropriate benchmark. Gleason is the default when report type is ambiguous.

---

## How to Run a Case

1. **Gather inputs** — email thread, incident report, opposing expert report, client documents received.

2. **Feed to Intake Agent** — paste all raw inputs into a conversation with `agents/intake/AGENT.md` as the system prompt. No formatting required.

3. **Review intake.md** — confirm no `[MISSING]` fields, or provide the missing information. Approve with `INTAKE COMPLETE: YES`.

4. **Pass to Research Agent** — start a new conversation with `agents/research/AGENT.md`, attach `intake.md`. Agent resolves all flags and builds the Section Plan.

5. **Pass to Drafting Agent** — start a new conversation with `agents/drafting/AGENT.md`, attach `research.md` + the appropriate benchmark PDF. Agent drafts the full report.

6. **Pass to QA Agent** — start a new conversation with `agents/qa/AGENT.md`, attach `draft.md` + `intake.md`. Agent runs the 10-point audit and returns a scored report.

7. **Lane reviews** — `draft.md` + `qa-report.md` go to Lane and Mariz. They apply final edits, resolve placeholders, and file.

---

## Case Folder Naming

```
[attorney-surname]-[plaintiff-surname]-[YYYY]
```

Examples: `carmona-gleason-2026` / `young-heagy-2026` / `carmona-anderson-2025`

---

## Research Flags (Quick Reference)

These flags are generated by the Intake Agent and resolved by the Research Agent:

| Flag | Triggers When |
|------|--------------|
| `CODE LOOKUP` | Jurisdiction + incident date present |
| `CXLT REGISTRY` | Opposing expert claims tribometry credentials |
| `PETERSON PLAYBOOK` | Opposing expert is John Peterson / RLC |
| `FOOTWEAR ANALYSIS` | Footwear description available |
| `SURVEILLANCE` | Surveillance video referenced |
| `PRIOR MATTER` | Prior incident at same location mentioned |
| `EXEMPLAR METHODOLOGY` | Plaintiff expert used non-ANSI-compliant device |

---

## Updating VOICE.md

After every new matter is filed, review the final report for:

- New boilerplate language not in VOICE.md
- New credential or certification blocks
- New analytical attack patterns
- New section headers or structural elements
- New recurring adversary tactics

**Protocol:** Lane or Mariz identifies new language → Caleb adds to VOICE.md → note update date and source case at bottom of file.

---

## Known Limitations (v1.0)

- **Code edition lookups** — Research Agent cannot independently access Clark County / City of Las Vegas adoption records in real time. Lane confirms code edition before Drafting Agent proceeds.
- **CXLT Registry** — If the public registry is inaccessible, mark `[PENDING REGISTRY CHECK]` and Lane confirms manually.
- **Photo integration** — Drafts are text-only. All `[INSERT FIGURE N]` placeholders require the DOCX formatting layer (Phase 4) to insert actual images.
- **Mariz's hospitality paragraph** — Populated from intake facts, but Lane/Mariz should review before filing.
- **TCDS credential** — Currently included in sign-off block. Lane to confirm exact credential title and applicable case types.

---

## Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 — Voice Analysis | ✅ Complete | VOICE.md v2.0 built from 9+ filed reports + 3 benchmarks |
| 2 — Agent System | ✅ Complete | 4 agent prompts + PIPELINE.md built |
| 3 — Live Test | 🟡 Active | First real incoming matter through the pipeline |
| 4 — DOCX Layer | ⬜ Pending | Photo integration, formatted output |
| 5 — Production | ⬜ Pending | Lane + Mariz running independently |

---

*BlackBar v1.0 — Swainston Consulting Group*
*Built by Caleb Swainston, March 2026*
