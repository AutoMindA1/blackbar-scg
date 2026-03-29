# Claude Code Handoff — BlackBar Spec Rebuild with Enterprise Brain

## Context

You are working in the `AutoMindA1/blackbar-scg` repo. This is a 4-agent Claude Code system for forensic expert witness rebuttal reports for Swainston Consulting Group (SCG). The agents (Intake → Research → Drafting → QA) already exist in `agents/`. VOICE.md is at repo root.

This session built ENTERPRISE_BRAIN.md — a 15-section domain knowledge document derived from Lane's VOICE.md. It feeds every agent's OODA Orient step with SCG-specific context. Now the three spec deliverables need to be rebuilt as final versions with the brain fully integrated.

---

## Your Task

Produce 3 files in `Docs/`:

1. **`Docs/BlackBar_Architecture.html`** — Interactive 10-tab HTML spec (replaces old `BlackBar_Architecture.html` at repo root)
2. **`Docs/BLACKBAR_FRONTEND_SPEC.md`** — Claude Code execution document (markdown)
3. **`ENTERPRISE_BRAIN.md`** — Place at repo root (same level as VOICE.md)

Also copy `blackbar-hero.png` (the orange-recolored low-poly bear) to repo root or `Brand/`.

---

## Source Files (read these first)

1. **ENTERPRISE_BRAIN.md** — The brain. 15 sections, 372 lines. Already complete. Read it fully before touching the specs.
2. **VOICE.md** — Lane's voice profile. Already in repo at root. The brain was derived from this.
3. **The current `blackbar-architecture-spec.html`** — 85% updated with brain integration. Finish the remaining edits.
4. **The current `BLACKBAR_FRONTEND_SPEC.md`** — 80% updated. Finish remaining edits for consistency.
5. **`blackbar-hero.png`** — Orange-recolored bear image. Already exported.

---

## Brand Identity

- **Name:** BlackBar
- **Tagline:** "Savage Wins"
- **Organization:** Swainston Consulting Group
- **Hero subtitle:** "From case intake to courtroom-ready rebuttal. Four AI agents. One pipeline. Every citation traced."
- **Accent:** #FF6B35 (warm amber/orange)
- **Fonts:** Fraunces (display), DM Sans (body), JetBrains Mono (mono)
- **Dark mode:** bg-deep #06080F, bg-base #0A0E17, bg-surface #111827
- **Hero image:** Low-poly geometric bear holding scales of justice, gold accents recolored to #FF6B35 orange
- **No "Lemonade" references anywhere** — all scrubbed. Design is original.

---

## HTML Spec (10 tabs)

The existing HTML has 9 tabs. Add **Enterprise Brain** as tab 10 (or insert between User Stories and File Structure). The brain tab must contain:

### Brain Tab Content:
- 4-card grid: What It Is, Why It Exists, How It Works, Drift Detection
- 15-section table (§1–§15 with section name + which agents query it)
- Attack patterns table (ATK-01 through ATK-10 with ID, pattern name, trigger)
- Voice constraints: 4-card grid showing Entity Voice rules, Prohibited Terms, Required Terms, QA Benchmark Test
- All content sourced from ENTERPRISE_BRAIN.md

### Other HTML Updates Needed:
1. **Hero section:** Bear image centered ABOVE the "AISDLC Phase 1 — Architecture Spec" pill badge. Then "BlackBar" title → "Savage Wins" (italic, accent color) → "SWAINSTON CONSULTING GROUP" (uppercase, muted, letterspaced) → subtitle → stat chips
2. **Overview:** Subtitle mentions brain: "...4 Claude Code agents — each grounded by ENTERPRISE_BRAIN.md — into a pipeline..."
3. **Pipeline stages:** Each of the 4 agent descriptions should include an italic line showing brain queries (e.g., "Brain queries: §3 Case Taxonomy, §4 Report Types, §8 Code Citation, §2 Personnel")
4. **Mockup case names:** Use real SCG naming format — "NP Santa Fe, LLC adv Gleason", "Clark County DoA adv Heagy", "Santa Fe Station adv Anderson", "Palace Station adv Jones"
5. **Mockup activity feed:** Brain-aware actions — "Drafting Agent inserted BLK-09 (ANSI A326.3 defense)", "Research Agent matched ATK-01 (credential attack) — Peterson CXLT expired", "QA Agent flagged 'prior to' (prohibited term)"
6. **Intake page card:** Case form includes case type (Brain §3 taxonomy dropdown), report type (Brain §4)
7. **QA page card:** References Brain §5 prohibited terms scan, Brain §12 format rules, Brain §11 benchmark test
8. **File structure:** Add `brain/` directory with ENTERPRISE_BRAIN.md, VOICE.md (symlink or copy), golden-set.json. Add `blackbar-hero.png` to `public/`
9. **API table:** Case creation endpoint includes caseType, reportType fields

### Bear image embedding:
The bear is large (~250KB base64 as JPEG). Options:
- Embed as base64 data URI in the HTML (self-contained but heavy)
- Reference as relative path `./blackbar-hero.png` (lighter, needs file alongside)
- For the GitHub Pages version, relative path is cleaner

---

## Markdown Spec Updates Needed

1. **Section 1 Overview:** Add "Enterprise Brain" subsection after UAT Scope explaining what the brain is, its 15 sections, and the pipeline↔brain mapping (which agent queries which sections)
2. **Section 4 Page Architecture:** Intake page mentions case type (Brain §3) and report type (Brain §4) in form fields. QA page references Brain §5, §11, §12.
3. **Section 5 Components:** CaseForm.tsx description includes brain-sourced fields
4. **Section 6 API Contract:** POST /api/cases includes caseType, reportType
5. **Section 7 Schema:** cases table has case_type (Brain §3 taxonomy) and report_type (Brain §4) columns with comments
6. **Section 9 Build Order:** Phase A includes brain/ directory setup. Phase G backend includes agentRunner loading ENTERPRISE_BRAIN.md with per-agent section routing.
7. **Section 10 Decisions:** Add row for Enterprise Brain — "Domain knowledge layer for agent Orient steps. 15 sections derived from VOICE.md. Drift-detected by golden set."
8. **No Lemonade references.** Zero. Check all sections.

---

## Pipeline ↔ Brain Mapping (Critical — agents must query correct sections)

### Intake Agent
- §3 Case Taxonomy (classify case type)
- §4 Report Types (determine report structure)
- §8 Standards & Codes (identify relevant jurisdiction + codes)
- §2 Personnel (confirm credentials for this case type)

### Research Agent
- §6 Analytical Attack Patterns (which ATK patterns apply)
- §8 Standards & Codes Reference (ANSI, NFSI, ASTM, IBC/UBC)
- §10 Known Adversary (is this John Peterson? deploy playbook)
- §9 Instruments & Testing (tribometer defense if needed)

### Drafting Agent
- §5 Voice Rules (identity, dates, prohibited/required terms, certainty language)
- §7 Standard Opinion Blocks (insert verbatim blocks, don't generate from scratch)
- §4 Report Types & Structure (correct section sequence for this report type)
- §12 Document Format Rules (headers, justification, figures, sign-off)

### QA Agent
- §11 Benchmark Cases (does this read like Gleason, Heagy, or Anderson?)
- §5 Prohibited Terms (scan for "negligent", "prior to", "I", "victim", etc.)
- §5 Identity/Date rules (entity voice check, European date format)
- §12 Format Rules (underlined headers, figure captions, footnote citations)

---

## Validation Checklist (run before committing)

- [ ] Zero "Lemonade" references in any file
- [ ] Bear image displays above the pill badge in HTML hero
- [ ] "Savage Wins" tagline + "Swainston Consulting Group" below title
- [ ] All 4 pipeline stages show brain query annotations
- [ ] Mockup uses SCG case naming (defendant adv plaintiff)
- [ ] Mockup activity feed references ATK/BLK codes
- [ ] Enterprise Brain tab renders with all 4 content sections
- [ ] cases table in schema has case_type and report_type columns
- [ ] POST /api/cases includes caseType, reportType
- [ ] CaseForm.tsx component description includes brain fields
- [ ] File structure shows brain/ directory
- [ ] Build order Phase A includes brain setup
- [ ] Build order Phase G includes brain loading in agentRunner
- [ ] HTML and Markdown specs are consistent (no contradictions)
- [ ] ENTERPRISE_BRAIN.md is at repo root alongside VOICE.md
- [ ] Hero subtitle: "From case intake to courtroom-ready rebuttal. Four AI agents. One pipeline. Every citation traced."

---

## Files to Commit

```
AutoMindA1/blackbar-scg/
├── ENTERPRISE_BRAIN.md          ← NEW (repo root, alongside VOICE.md)
├── Docs/
│   ├── BlackBar_Architecture.html  ← REPLACE (10-tab spec with brain)
│   └── BLACKBAR_FRONTEND_SPEC.md   ← NEW (Claude Code execution doc)
└── Brand/
    └── blackbar-hero.png           ← NEW (orange bear)
```

Old `BlackBar_Architecture.html` at repo root can remain as archive or be deleted — the canonical version moves to `Docs/`.

---

## Commit Message

```
feat: integrate ENTERPRISE_BRAIN.md into BlackBar specs

- Add ENTERPRISE_BRAIN.md (15 sections, derived from VOICE.md)
- Rebuild architecture spec with Enterprise Brain tab (10 tabs total)
- Update pipeline stages with per-agent brain query annotations
- Add BLACKBAR_FRONTEND_SPEC.md (Claude Code execution document)
- Update schema with case_type/report_type (Brain §3/§4)
- Replace mockup with real SCG case naming and brain-aware activity feed
- Add orange-recolored bear hero image
- Remove all Lemonade references
```
