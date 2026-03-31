# Tier 1 Integration Gaps
Generated: 2026-03-28

## Overview

The 26 March pressure test identified 15 Tier 1 blocking issues. As of this analysis, **0 of 15 fixes are integrated into the agent prompts or governing documents.** Templates and reference stubs were created on 28 March (contributory-negligence-gate.md, limitation-disclosure.md, nevada-code-table.md, ada-edition-map.md, etc.), but no agent prompt file has been updated to reference or enforce them.

Lane's responses (lane-responses-2026-03-28.md) provide actionable input for several fixes, but that input has not been wired into the agent specs.

This report identifies every specific insertion point where each Tier 1 fix must land. Items are grouped by the Tier 1 fix number they address.

---

## Gap 1: T1-01 — Intake Agent has no mandatory field enforcement for INTAKE COMPLETE: YES

**File:** `agents/intake/BlackBar-Intake.md`
**Line(s):** ~176-178
**Issue:** The `INTAKE COMPLETE: YES` checkbox has no minimum completeness standard. The agent can mark YES while critical fields are `[MISSING]`. Pressure test requires mandatory minimums: incident date, defendant legal name (not DBA), specific incident location, alleged mechanism, report type, and at least one document confirmed received.

**Patch:**
```diff
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-INTAKE COMPLETE:  [ ] YES — ready for Research Agent
-                  [ ] NO — open items above must be resolved first
+INTAKE COMPLETE:  [ ] YES — ready for Research Agent
+                  [ ] NO — open items above must be resolved first
+
+MANDATORY FIELDS FOR INTAKE COMPLETE: YES
+The following fields MUST be populated (not [MISSING]) before marking YES:
+  1. Incident Date
+  2. Defendant (full legal name — not DBA alone)
+  3. Specific Location Within Venue
+  4. Alleged Mechanism
+  5. Report Type
+  6. At least one document in DOCUMENTS RECEIVED confirmed received
+If ANY of these six fields is [MISSING], INTAKE COMPLETE must be NO.
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Gap 2: T1-02 — Litigation Timeline block exists in Intake schema but lacks court designation and applicable rules

**File:** `agents/intake/BlackBar-Intake.md`
**Line(s):** ~55-64
**Issue:** The LITIGATION TIMELINE block was added (it includes complaint filed date, disclosure deadlines, trial date) but is missing two required fields from the pressure test: court designation (USDC vs. Eighth Judicial District) and applicable disclosure rules (FRCP 26 vs. NRCP 16.1). Lane confirmed (lane-responses-2026-03-28.md) deadlines come from court or client, and Clio is the system of record.

**Patch:**
```diff
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LITIGATION TIMELINE
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Complaint Filed Date:
 Plaintiff Expert Disclosure Deadline:
 Defense Expert Disclosure Deadline:
 Trial Date:
+Court Designation: [ ] USDC (Federal) [ ] Eighth Judicial District (State) [ ] Other: ___
+Applicable Disclosure Rules: [ ] FRCP 26 (Federal) [ ] NRCP 16.1 (State)
 Client-Imposed Deadline (if any):
 Client Deadline Reason:
-Deadline Source: [Court / Client / Clio]
+Deadline Source: [Court / Client / Clio] — If not provided, flag as [MISSING — CHECK CLIO]
```

---

## Gap 3: T1-03 — SPOLIATION flag missing from Intake Agent Research Flags

**File:** `agents/intake/BlackBar-Intake.md`
**Line(s):** ~153-166
**Issue:** No SPOLIATION flag exists in the Research Flags section. Pressure test requires: any indication of destroyed/overwritten evidence = BLOCKING open item immediately, regardless of other completeness status.

**Patch:**
```diff
   [ ] SURVEILLANCE — Video available; flag for 4-question framework analysis
   [ ] ADA/A117.1 — Accessibility standards may be at issue
+  [ ] SPOLIATION — Evidence destroyed, overwritten, or unavailable (surveillance deleted, physical evidence altered/discarded, scene remediated without documentation). If triggered: BLOCKING open item — do NOT mark INTAKE COMPLETE: YES until spoliation scope is documented.
```

**File:** `agents/intake/BlackBar-Intake.md`
**Line(s):** ~183-211 (BEHAVIOR RULES section)
**Issue:** No behavior rule addresses spoliation as a blocking condition that overrides normal completeness.

**Patch:**
```diff
 **8. Single output.**
 Produce one clean Intake Brief. Do not add commentary, suggestions, or analysis outside the Brief. Your job ends when you hand off the Brief.
+
+**9. Spoliation override.**
+If ANY input suggests evidence has been destroyed, overwritten, or is unavailable (deleted surveillance, remediated surface without documentation, discarded physical items), immediately add the SPOLIATION Research Flag and add a BLOCKING open item. A SPOLIATION flag prevents INTAKE COMPLETE: YES regardless of all other field completeness. Document what evidence is affected and what is known about its destruction.
```

---

## Gap 4: T1-04 — STAIR/RISER/HANDRAIL Research Flag missing from Intake Agent

**File:** `agents/intake/BlackBar-Intake.md`
**Line(s):** ~153-166
**Issue:** No STAIR/RISER/HANDRAIL flag exists. Stair cases require dedicated IBC Chapter 10/Section 1011 analysis, not a generic CODE LOOKUP.

**Patch:**
```diff
   [ ] ADA/A117.1 — Accessibility standards may be at issue
+  [ ] STAIR/RISER/HANDRAIL — Triggered by any reference to stair, step, riser, landing, or handrail in incident location or mechanism. Requires dedicated IBC Chapter 10 / Section 1011 and A117.1 Section 504 analysis — not generic CODE LOOKUP.
   [ ] SPOLIATION — Evidence destroyed, overwritten, or unavailable
```

**File:** `agents/intake/BlackBar-Intake.md`
**Line(s):** ~89-93 (Incident Type section)
**Issue:** The Incident Type checkboxes include "Stair / step / elevation change" but no behavior rule auto-triggers the STAIR/RISER/HANDRAIL flag when this type is selected.

**Patch:**
```diff
 **5. Plaintiff Expert flags.**
 If the plaintiff expert is identified, always add a CXLT REGISTRY flag to the Research Flags section. If the name is John Peterson (Retail Litigation Consultants), always add PETERSON-PLAYBOOK as a Research Flag.
+
+**5a. Stair/elevation auto-flag.**
+If Incident Type is "Stair / step / elevation change" OR if any input mentions stairs, steps, risers, landings, handrails, or elevation changes, always add a STAIR/RISER/HANDRAIL Research Flag. This flag requires the Research Agent to perform a dedicated IBC Chapter 10 analysis — a generic CODE LOOKUP is insufficient for stair cases.
```

---

## Gap 5: T1-05 — Defendant field is a single text field, not a structured entity list

**File:** `agents/intake/BlackBar-Intake.md`
**Line(s):** ~45-49
**Issue:** "Defendant (full legal name as it appears in caption)" is a single unstructured field. Pressure test requires: entity type, state of formation, DBA status, Property Owner of Record (separate from Named Defendant), SCG Retention Scope.

**Patch:**
```diff
-Defendant (full legal name as it appears in caption):
-Plaintiff Surname:
-Case Caption (for Subject line): [Defendant] adv [Plaintiff Surname]
-Opposing Counsel Name:
-Opposing Counsel Firm/Client:
+━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
+DEFENDANT / ENTITY IDENTIFICATION
+━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
+Defendant Legal Name (as it appears in caption):
+Entity Type: [ ] LLC [ ] LP [ ] Corporation [ ] Individual [ ] Government [ ] Other: ___
+State of Formation:
+DBA / Trade Name (if applicable):
+Property Owner of Record (if different from Named Defendant):
+SCG Retention Scope: [ ] Full premises analysis [ ] Rebuttal only [ ] Consulting (non-testifying) [ ] Other: ___
+
+Plaintiff Surname:
+Case Caption (for Subject line): [Defendant Legal Name] adv [Plaintiff Surname]
+Opposing Counsel Name:
+Opposing Counsel Firm/Client:
```

---

## Gap 6: T1-06 — Research Agent references a vague code history instead of the hard-coded jurisdiction table

**File:** `agents/research/BlackBar-Research.md`
**Line(s):** ~42-47
**Issue:** The "Common Nevada code history" section contains vague ranges ("Pre-1992," "1992-2000: Depends on jurisdiction," "Post-2000: IBC on a cycle"). This is factually incomplete per pressure test: 1997 UBC is omitted, each jurisdiction adopts independently, and the table must be verified against SNBO records. The reference file `reference/nevada-code-table.md` was created as a stub but the Research Agent prompt does not reference it.

**Patch:**
```diff
-**Common Nevada code history:**
-- Pre-1992 construction: Uniform Building Code (UBC), typically 1988 or earlier edition
-- 1992–2000: Depends on jurisdiction adoption schedule
-- Post-2000: International Building Code (IBC) on a cycle — Clark County adoption years vary
-- Confirm current adoption at: Clark County Development Services / City of Las Vegas Building & Safety
+**Code Edition Lookup — MANDATORY REFERENCE FILE:**
+1. Read `/BLACK-BAR/reference/nevada-code-table.md` — the verified jurisdiction-by-edition adoption table.
+2. Look up the property jurisdiction (Clark County, City of Las Vegas, Henderson, North Las Vegas, unincorporated) and the permit/construction year.
+3. Find the row/column intersection to determine the applicable code edition.
+4. If the cell is blank or the table has not been populated for that jurisdiction/edition, output: `CODE DETERMINATION: UNRESOLVED — nevada-code-table.md does not contain verified effective date for [jurisdiction] / [edition]. Lane must confirm before Drafting Agent proceeds.`
+5. Do NOT fall back to general knowledge or training data for Nevada code adoption dates.
+
+**Note:** Nevada has no statewide IBC adoption mandate. The Southern Nevada Building Officials (SNBO) coordinate adoption, but each jurisdiction passes its own ordinance with potentially different effective dates. UBC editions 1982, 1985, 1988, 1991, and 1997 were all in use depending on jurisdiction and permit year.
```

**File:** `agents/research/BlackBar-Research.md`
**Line(s):** ~15-24 (INPUTS section)
**Issue:** The INPUTS section does not list `reference/nevada-code-table.md` as a required input file.

**Patch:**
```diff
 1. `/BLACK-BAR/cases/[Case-ID]/intake.md` — the completed Intake Brief
 2. `/BLACK-BAR/VOICE.md` — the governing voice and structure document (read in full)
 3. `/BLACK-BAR/benchmarks/SCG Report - Gleason.pdf` — benchmark Initial Report
 4. `/BLACK-BAR/benchmarks/SCG Rebuttal Report - Heagy.pdf` — benchmark Rebuttal Report
 5. `/BLACK-BAR/benchmarks/SCG Supplemental Report - Anderson.pdf` — benchmark Supplemental Report
+6. `/BLACK-BAR/reference/nevada-code-table.md` — verified jurisdiction × code edition adoption dates
+7. `/BLACK-BAR/reference/nfsi-thresholds.md` — DCOF/SCOF thresholds with source citations
+8. `/BLACK-BAR/reference/ada-edition-map.md` — A117.1 edition → IBC mapping
+9. `/BLACK-BAR/reference/cxlt-fallback.md` — offline CXLT registry snapshot (use only if live registry unreachable)
+10. `/BLACK-BAR/reference/peterson-playbook.md` — counter-argument reference for John Peterson
+11. `/BLACK-BAR/reference/credential-registry.md` — Lane/Mariz credential verification status
```

---

## Gap 7: T1-07 — ADA/A117.1 flag has no resolution protocol in Research Agent

**File:** `agents/research/BlackBar-Research.md`
**Line(s):** Between the SURVEILLANCE flag resolution (line ~134) and the BOILERPLATE BLOCK SELECTION section (line ~150)
**Issue:** The Intake Agent has an `ADA/A117.1` flag, but the Research Agent has NO flag resolution protocol for it. The pressure test requires: (a) jurisdiction trigger with ADA effective dates, (b) applicable A117.1 edition mapping, (c) surface provisions with dimensional thresholds, (d) IBC interaction, (e) alteration trigger. The reference file `reference/ada-edition-map.md` was created as a stub but is not referenced in the agent prompt.

**Patch:**
```diff
 ---

 ### FLAG: EXEMPLAR METHODOLOGY
+---
+
+### FLAG: ADA/A117.1
+**Task:** Determine whether ADA and/or ICC A117.1 accessibility standards apply and identify relevant provisions.
+
+**Process:**
+1. Read `/BLACK-BAR/reference/ada-edition-map.md` for edition mapping and trigger logic.
+2. Determine if property is a "place of public accommodation" (Title III) or state/local government facility (Title II).
+3. Check construction/alteration date against ADA effective dates:
+   - New construction: July 26, 1990
+   - Existing facilities (Title III): January 26, 1992
+   - Alterations: ADA Standards for Accessible Design apply to altered elements + path of travel (20% cost cap)
+4. Determine applicable A117.1 edition by mapping the IBC edition from `nevada-code-table.md` to the A117.1 edition referenced by that IBC version.
+5. Check A117.1 §302 (floor surfaces — firm, stable, slip-resistant) and §303 (changes in level — dimensional thresholds).
+6. Note IBC Chapter 11 (accessibility) interaction — IBC may be more stringent than ADA minimums.
+7. If ada-edition-map.md is unpopulated for the relevant edition, output: `ADA DETERMINATION: UNRESOLVED — edition mapping incomplete. Lane/CBO must verify before Drafting Agent proceeds.`
+
+**Output format:**
+```
+ADA DETERMINATION
+Property Type: [public accommodation / government / private — not covered]
+ADA Applicability: [YES — Title II/III / NO / UNRESOLVED]
+Construction/Alteration Date: [date]
+Applicable A117.1 Edition: [edition year]
+Relevant Provisions:
+  - A117.1 §302: [floor surface requirements]
+  - A117.1 §303: [changes in level thresholds]
+  - IBC Chapter 11: [additional requirements if any]
+Alteration Trigger: [YES — path of travel obligation / NO / N/A]
+```
+
+---
+
+### FLAG: STAIR/RISER/HANDRAIL
+**Task:** Perform dedicated stair/elevation code analysis using IBC Chapter 10.
+
+**Process:**
+1. Identify applicable code edition from `nevada-code-table.md`.
+2. Pull IBC Section 1011 (stairways) or equivalent UBC section for the applicable edition.
+3. Check: riser height, tread depth, nosing profile, handrail height/graspability, landing dimensions, uniformity requirements.
+4. If A117.1 flag is also active, cross-reference A117.1 §504 (stairways) for accessible stairway requirements.
+5. Note if plaintiff expert cited different dimensional standards — flag as "NOT ADOPTED" if inapplicable.
+
+**Output format:**
+```
+STAIR CODE DETERMINATION
+Applicable Code: [code name + year]
+Relevant Section(s):
+  - Section [X]: Riser height — [requirement] vs. [measured/alleged]
+  - Section [X]: Tread depth — [requirement] vs. [measured/alleged]
+  - Section [X]: Handrail — [requirement] vs. [measured/alleged]
+  - Section [X]: Nosing — [requirement]
+  - Section [X]: Uniformity — [requirement]
+A117.1 §504 Applicable: [YES/NO]
+Plaintiff Expert Cited: [what they cited, if applicable]
+Applicability Note: [Is their citation adopted?]
+```
```

---

## Gap 8: T1-08 — Research Agent has no HANDOFF GATE template

**File:** `agents/research/BlackBar-Research.md`
**Line(s):** ~222-233 (OUTPUT section)
**Issue:** The Research Agent can hand off to the Drafting Agent with unresolved code determination, failed CXLT lookup, and pending surveillance. Pressure test requires a 5-field HANDOFF GATE that blocks the Drafting Agent on any BLOCKING item.

**Patch:**
```diff
 ## OUTPUT

 Compile everything above into a single Research Brief and save as:
 `/BLACK-BAR/cases/[Case-ID]/research.md`

+**HANDOFF GATE — Required before handoff is valid:**
+
+```
+RESEARCH HANDOFF GATE
+━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
+1. Code Determination: [ ] RESOLVED — [edition cited] [ ] UNRESOLVED — reason: ___
+2. CXLT Lookup: [ ] CONFIRMED REACHABLE — status retrieved [ ] MANUAL VERIFY REQUIRED — reason: ___
+3. Surveillance: [ ] COMPLETE [ ] NOT APPLICABLE [ ] BLOCKING — awaiting: ___
+4. VOICE.md Version: [date stamp from bottom of VOICE.md]
+5. Open Items:
+   BLOCKING: [list or NONE]
+   NON-BLOCKING: [list or NONE]
+
+HANDOFF STATUS: [ ] CLEAR — no BLOCKING items [ ] BLOCKED — Drafting Agent must NOT proceed
+━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
+```
+
+**Rule:** If ANY item is UNRESOLVED/BLOCKING, HANDOFF STATUS must be BLOCKED. The Drafting Agent must not proceed until all BLOCKING items are resolved or Lane explicitly overrides.
+
 End with:

```
 >> HANDOFF TO DRAFTING AGENT — Research Brief complete.
    Benchmark selected: [Gleason / Heagy / Anderson]
    Open items for Drafting Agent: [list any items still MISSING or TBD]
```
```

**File:** `agents/drafting/BlackBar-Drafting.md`
**Line(s):** ~14-21 (INPUTS section)
**Issue:** Drafting Agent reads `research.md` but has no instruction to check the HANDOFF GATE before proceeding.

**Patch:**
```diff
 **The Section Plan in the Research Brief governs your structure.** Do not add, remove, or reorder sections without flagging it to the QA Agent.
+
+**HANDOFF GATE CHECK — Before drafting begins:**
+Read the RESEARCH HANDOFF GATE section of the Research Brief. If HANDOFF STATUS is BLOCKED, do NOT proceed. Output:
+```
+>> DRAFTING HOLD — Research Brief HANDOFF GATE is BLOCKED.
+   Blocking items: [list from gate]
+   Drafting Agent cannot proceed until these are resolved.
+```
```

---

## Gap 9: T1-09 — Drafting Agent and VOICE.md NEVER USE list is incomplete

**File:** `VOICE.md`
**Line(s):** ~293-308 (Section 11, NEVER USE table)
**Issue:** VOICE.md Section 11 was partially updated (lane-responses-2026-03-28.md confirms "prior to" -> "before" and absolute terms). However, the current VOICE.md already includes most T1-09 terms ("unreasonably dangerous", "reasonable care", "reasonable person", "fault", "victim", "safe"/"unsafe", "causation", "clearly"/"obviously"). The remaining gap is: "slip and fall" (unhyphenated) is not in the NEVER USE list — only the hyphenated "slip-and-fall" is prohibited. Also "accident" (unqualified) is not explicitly in the NEVER USE table, though the ALWAYS USE table says "alleged accident."

**Patch for VOICE.md:**
```diff
 | "slip-and-fall" (hyphenated) | Use "slip and fall" |
+| "slip and fall" (as compound noun — e.g., "a slip and fall") | Use "slip and fall" only as a verb phrase: "allegedly slipped and fell." Never as a standalone noun: "the slip and fall." Use "the alleged incident" or "the alleged accident" instead. |
+| "accident" (unqualified — "the accident") | Always qualify: "the alleged accident" or use "the subject incident." Never "the accident" standing alone. |
 | "in my opinion" | Use "In SCG's opinion" or restructure entirely |
+| "prior to" | Use "before" — Lane directive (28 Mar 2026) |
```

**File:** `agents/drafting/BlackBar-Drafting.md`
**Line(s):** ~25-47 (GOVERNING RULES section)
**Issue:** The Drafting Agent's Factual Framing Rules say "Never write 'the accident.' Always 'the alleged accident' or 'the subject incident'" — this partially covers the "accident (unqualified)" item. But the Drafting Agent has NO explicit NEVER USE list embedded. It relies on the drafter reading VOICE.md Section 11. The pressure test requires the NEVER USE terms to be directly in the Drafting Agent prompt so they are enforced even if VOICE.md read fails.

**Patch:**
```diff
 ### Voice Rules
 - Full-justification paragraphs (the format implies this; the docx generator enforces it)
+
+### NEVER USE — Prohibited Terms (from VOICE.md Section 11)
+The following terms must NEVER appear in the draft. If any appears, replace immediately:
+| Prohibited | Replacement |
+|-----------|-------------|
+| "I" (in body text) | "SCG" or "The author of this Report" |
+| "dangerous condition" | Describe the condition factually |
+| "negligent" / "negligence" | For counsel to argue, not expert |
+| "unreasonably dangerous" | Legal conclusion — for counsel |
+| "reasonable care" / "reasonable person" | Legal standard — for counsel |
+| "fault" | Use "contributing factor(s)" |
+| "victim" | Use "Plaintiff" |
+| "safe" / "unsafe" (standalone) | Describe condition against named standard |
+| "causation" (without physical modifier) | Use "contributing factor(s)" or "physical contributing factor" |
+| "clearly" / "obviously" (standalone) | Let evidence speak; use within "open and obvious" framework only |
+| "accident" (unqualified) | "alleged accident" or "subject incident" |
+| "prior to" | "before" |
+| "slip-and-fall" (hyphenated) | "slip and fall" (verb phrase only) |
+| "in my opinion" | "In SCG's opinion" |
+
```

---

## Gap 10: T1-10 — Block 7 (NSC Distracted Walking) is not marked CONDITIONAL in Research or Drafting agents

**File:** `agents/research/BlackBar-Research.md`
**Line(s):** ~175-177 (Block 7 entry in BOILERPLATE BLOCK SELECTION)
**Issue:** Block 7 selection says "YES / NO" with a narrative reason. There is no CONDITIONAL gate requiring `CONTRIBUTORY NEGLIGENCE AUTHORIZED BY COUNSEL: YES`. The template file `templates/contributory-negligence-gate.md` exists but is not referenced by the Research Agent.

**Patch:**
```diff
-Block 7 — NSC distracted walking quote: [YES / NO]
-  Reason: [include in trips or attention-diversion cases]
+Block 7 — NSC distracted walking quote: [YES / NO / CONDITIONAL]
+  GATE: Requires Intake Brief field `Contributory Negligence Strategy: YES`.
+  DEFAULT: YES — contributory negligence is nearly universal in premises liability defense.
+  If Intake Brief says NO or counsel explicitly opted out → Block 7 = NO.
+  If YES or not specified → Block 7 = YES.
+  See: `/BLACK-BAR/templates/contributory-negligence-gate.md` for full gate rules.
+  Output in Research Brief: `CONTRIBUTORY NEGLIGENCE AUTHORIZED BY COUNSEL: YES / NO`
```

**File:** `agents/drafting/BlackBar-Drafting.md`
**Line(s):** ~96-99 (Section Drafting Protocol)
**Issue:** No instruction to check the contributory negligence gate before inserting Block 7. Also, "payment of attention" should be CONDITIONAL USE, not ALWAYS USE per pressure test.

**Patch:**
```diff
 **Step 2: Select and insert the correct boilerplate blocks.**
 Use the exact verbatim text from VOICE.md for every selected block. Do not paraphrase boilerplate. Do not modernize it. Do not "improve" it.
+
+**CONDITIONAL BLOCK RULE — Block 7 (NSC Distracted Walking):**
+Do NOT insert Block 7 unless the Research Brief contains `CONTRIBUTORY NEGLIGENCE AUTHORIZED BY COUNSEL: YES`. If the field is absent or NO, exclude Block 7 entirely. The phrase "payment of attention" is also CONDITIONAL — use only when Block 7 is authorized.
```

---

## Gap 11: T1-11 — LIMITATION DISCLOSURE block missing from Drafting and QA agents

**File:** `agents/drafting/BlackBar-Drafting.md`
**Line(s):** Between PLACEHOLDERS section (~182) and OUTPUT section (~197)
**Issue:** No instruction to insert the limitation disclosure when surface was remediated before SCG inspection. Template exists at `templates/limitation-disclosure.md` but the Drafting Agent does not reference it. Lane confirmed (lane-responses-2026-03-28.md) that SCG avoids referencing the remediation itself (FRE 407/NRS 48.135), and the template was revised accordingly.

**Patch:**
```diff
 Placeholders do not stop the draft from proceeding. The QA Agent tracks all open placeholders.

+---
+
+## LIMITATION DISCLOSURE — SURFACE REMEDIATION
+
+**Trigger:** Research Brief contains `LIMITATION-DISCLOSURE-REQUIRED: YES` (surface was remediated/repaired/replaced before SCG inspection).
+
+**Action:** Insert the verbatim block from `/BLACK-BAR/templates/limitation-disclosure.md` immediately after the last measurement/testing paragraph in the relevant Points of Opinion section.
+
+**Rules:**
+1. Replace [date] with SCG's actual inspection date from the Intake Brief.
+2. Do NOT reference the nature of any remediation, repair, or replacement — this triggers FRE 407 / NRS 48.135 concerns.
+3. Do NOT paraphrase, reorder, or split across paragraphs.
+4. If multiple surfaces were inspected post-remediation, repeat the block for each surface with its own inspection date.
+
```

**File:** `agents/qa/BlackBar-QA.md`
**Line(s):** Between CHECK 7 (~121) and CHECK 8 (~126)
**Issue:** QA Agent has no check for the limitation disclosure. If the Research Brief flagged LIMITATION-DISCLOSURE-REQUIRED: YES but the Drafting Agent omitted the block, QA will not catch it.

**Patch:**
```diff
 ---

+### CHECK 7A: Limitation Disclosure Compliance
+
+If the Research Brief contains `LIMITATION-DISCLOSURE-REQUIRED: YES`:
+- [ ] Limitation disclosure block is present in the draft
+- [ ] Block text matches `/BLACK-BAR/templates/limitation-disclosure.md` verbatim
+- [ ] [date] placeholder has been replaced with actual SCG inspection date
+- [ ] No reference to the nature of remediation/repair/replacement (FRE 407 / NRS 48.135)
+
+If LIMITATION-DISCLOSURE-REQUIRED is YES but the block is absent: **Flag as BLOCKING.**
+
+---
+
 ### CHECK 8: Placeholder Audit
```

---

## Gap 12: T1-12 — QA Agent escalation threshold is >5 instead of >3, and lacks mandatory triggers

**File:** `agents/qa/BlackBar-QA.md`
**Line(s):** ~254-262 (ESCALATION PROTOCOL)
**Issue:** Current threshold is ">5 blocking issues." Pressure test requires >3. Also missing: mandatory escalation triggers regardless of total count for specific failure types.

**Patch:**
```diff
 ## ESCALATION PROTOCOL

-If the draft has more than 5 blocking issues across Checks 1-7, or if CHECK 9 produces three or more ❌ FAIL scores, escalate:
+If the draft has more than 3 blocking issues across Checks 1-7, or if CHECK 9 produces three or more ❌ FAIL scores, escalate:
+
+**Mandatory escalation triggers (regardless of total blocking count):**
+- Any Check 10 fact discrepancy on venue name, incident date, or attorney name
+- Any Check 6 failure (conclusion boilerplate integrity)
+- Any Check 5 failure on mandatory boilerplate blocks (Blocks 1, 4, or 11 when selected)
+- Benchmark PDF load failure (see CHECK 9A below)
+- Check 9 ❌ FAIL on the Conclusion section

 ```
 >> QA ESCALATION — Draft requires significant revision before Lane review.
```

---

## Gap 13: T1-13 — QA Agent has no benchmark load verification step

**File:** `agents/qa/BlackBar-QA.md`
**Line(s):** ~139 (before CHECK 9: Benchmark Comparison)
**Issue:** If the benchmark PDF fails to load, the agent scores against its own training memory — not against an actual filed SCG report. Pressure test requires a load verification step with explicit status output, and immediate escalation on failure.

**Patch:**
```diff
 ### CHECK 9: Benchmark Comparison

-Load the selected benchmark report. Read the section most analogous to the draft section being evaluated. Ask:
+**CHECK 9A — Benchmark Load Verification (run before scoring):**
+
+Attempt to load the selected benchmark PDF. Output:
+```
+BENCHMARK STATUS:
+  Gleason.pdf: [LOADED / FAILED / NOT SELECTED]
+  Heagy.pdf: [LOADED / FAILED / NOT SELECTED]
+  Anderson.pdf: [LOADED / FAILED / NOT SELECTED]
+```
+
+If the selected benchmark returns FAILED: CHECK 9 = SUSPENDED. Do NOT score any sections. Escalate immediately:
+```
+>> QA ESCALATION — Benchmark PDF failed to load. Check 9 (Benchmark Comparison) is SUSPENDED.
+   No voice calibration scores are valid without a loaded benchmark.
+```
+
+**CHECK 9B — Benchmark Comparison (only if 9A passes):**
+
+Load the selected benchmark report. Read the section most analogous to the draft section being evaluated. Ask:
```

---

## Gap 14: T1-14 — QA Agent missing Opinion Sufficiency check (proposed Check 11)

**File:** `agents/qa/BlackBar-QA.md`
**Line(s):** After CHECK 10 (~171), before QA REPORT OUTPUT FORMAT (~176)
**Issue:** No check validates that Points of Opinion paragraphs express actual conclusions (not just factual observations), contain confidence language, and are linked to documentation. A report can pass all 10 current checks with zero expert opinions.

**Patch:**
```diff
 Flag any discrepancy: "Draft states [X]; Intake Brief states [Y]. Verify before filing."

+---
+
+### CHECK 11: Opinion Sufficiency
+
+For each paragraph in the Points of Opinion section, verify:
+
+- [ ] **(a) Conclusion present:** The paragraph expresses an expert conclusion or opinion, not merely a factual observation or recitation.
+- [ ] **(b) Confidence language:** The paragraph contains "within a reasonable degree of professional certainty" or equivalent confidence qualifier (at least once per major opinion cluster, not necessarily every paragraph).
+- [ ] **(c) Documentation link:** The conclusion is explicitly linked to at least one document in the Documentation Reviewed list, a specific measurement, or a specific physical observation from the Inspection section.
+
+**Flag format:** "Points of Opinion paragraph [N]: [OBSERVATION ONLY — no conclusion expressed] / [NO CONFIDENCE LANGUAGE in opinion cluster] / [CONCLUSION NOT LINKED to documentation or measurement]."
+
+If more than half of Points of Opinion paragraphs fail (a): flag as **BLOCKING** — the draft reads as a factual summary, not an expert report.
+
```

---

## Gap 15: T1-15 — QA Agent missing Internal Consistency check (proposed Check 12)

**File:** `agents/qa/BlackBar-QA.md`
**Line(s):** After CHECK 11 (new), before QA REPORT OUTPUT FORMAT
**Issue:** No cross-section consistency verification exists. The Drafting Agent may analyze a wet floor in Points of Opinion after describing an uneven surface in Incident Details. Each section passes its checks in isolation.

**Patch:**
```diff
+---
+
+### CHECK 12: Internal Consistency
+
+Cross-reference key facts across all sections of the draft:
+
+- [ ] **(a) Mechanism consistency:** Extract the alleged mechanism from Incident Details. Verify every Points of Opinion analysis is responsive to that mechanism (e.g., if mechanism is "trip on uneven surface," opinions about wet floor slip resistance are inconsistent).
+- [ ] **(b) Venue name consistency:** Verify venue name is identical in: header block, Incident Details, Documentation Reviewed list, Points of Opinion, and Conclusion.
+- [ ] **(c) Incident date consistency:** Verify incident date is identical across all sections and the Documentation Reviewed list.
+- [ ] **(d) Expertise-to-opinion alignment:** Verify the expertise cited in Qualifications supports the opinions offered in Points of Opinion (e.g., if opinions address building codes, CBO credential must be established in Qualifications).
+
+**Flag format:** "[Section A] states [X]; [Section B] states [Y]. Internal inconsistency — verify before filing."
+
+Any mechanism mismatch (a) is **BLOCKING.** Other inconsistencies are **REVIEW** items.
+
```

**File:** `agents/qa/BlackBar-QA.md`
**Line(s):** ~176-248 (QA REPORT OUTPUT FORMAT)
**Issue:** The QA Report template lists Checks 1-10 only. Needs to include Checks 11-12.

**Patch:**
```diff
 CHECK 10 — Fact Accuracy: [PASS / FAIL]
   Findings: [list or "None"]

+CHECK 11 — Opinion Sufficiency: [PASS / FAIL]
+  Findings: [list or "None"]
+
+CHECK 12 — Internal Consistency: [PASS / FAIL]
+  Findings: [list or "None"]
+
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PRIORITY ISSUES — FIX BEFORE FILING
```

---

## Gap 16: PIPELINE.md does not reflect any Tier 1 changes

**File:** `PIPELINE.md`
**Line(s):** ~73-93 (HANDOFF CONTRACTS)
**Issue:** PIPELINE.md defines handoff contracts but does not enforce mandatory field minimums (T1-01), the Research HANDOFF GATE (T1-08), or the revised QA escalation threshold (T1-12). The pipeline architecture document should be the authoritative source for handoff rules.

**Patch:**
```diff
 ### Intake → Research
 **Intake Agent produces:** `intake.md`
-**Required before handoff:** Status line reads `INTAKE COMPLETE: YES`
-**Blocked by:** Any field marked `[MISSING — needs input]`
+**Required before handoff:** Status line reads `INTAKE COMPLETE: YES` AND all 6 mandatory fields populated (incident date, defendant legal name, specific location, alleged mechanism, report type, at least one document received)
+**Blocked by:** Any mandatory field marked `[MISSING]` OR any SPOLIATION flag active
 **Trigger phrase:** `>> HANDOFF TO RESEARCH AGENT`

 ### Research → Drafting
 **Research Agent produces:** `research.md`
-**Required before handoff:** All Research Flags resolved OR marked `TBD — Drafting Agent to use placeholder`
+**Required before handoff:** RESEARCH HANDOFF GATE status is CLEAR. All BLOCKING items resolved. All Research Flags resolved OR marked NON-BLOCKING with reason.
 **Trigger phrase:** `>> HANDOFF TO DRAFTING AGENT`
```

```diff
 ### QA → Lane/Mariz
 **QA Agent produces:** `qa-report.md`
-**Required before handoff:** All 10 checks completed
+**Required before handoff:** All 12 checks completed (Checks 1-10 original + Check 11 Opinion Sufficiency + Check 12 Internal Consistency)
 **Clean handoff trigger:** `>> READY FOR LANE/MARIZ`
-**Escalation trigger:** `>> QA ESCALATION` (returns to Drafting Agent)
+**Escalation trigger:** `>> QA ESCALATION` (returns to Drafting Agent) — triggered at >3 blocking issues OR any mandatory escalation trigger (see QA Agent spec)
```

---

## Gap 17: README.md status is contradictory — says "Phase 3 — First Live Test" while 0/15 Tier 1 fixes are implemented

**File:** `README.md`
**Line(s):** ~7, ~195-201
**Issue:** README says "Status: Phase 3 — First Live Test" and the Phases table shows Phase 3 as "Active." The pressure test issued a NO-GO verdict. README should reflect the actual system status.

**Patch:**
```diff
-**Status:** Phase 3 — First Live Test
+**Status:** Phase 3 — BLOCKED (0/15 Tier 1 pressure test fixes implemented; NO-GO for live production)
```

```diff
-| 3 — Live Test | 🟡 Active | First real incoming matter through the pipeline |
+| 3 — Live Test | 🔴 Blocked | 15 Tier 1 fixes from 26 March pressure test must be integrated before first live case |
```

**File:** `README.md`
**Line(s):** ~153-167 (Research Flags Quick Reference)
**Issue:** The Research Flags table is missing SPOLIATION (T1-03), STAIR/RISER/HANDRAIL (T1-04), and ADA/A117.1 (already in Intake but not in README table).

**Patch:**
```diff
 | `EXEMPLAR METHODOLOGY` | Plaintiff expert used non-ANSI-compliant device |
+| `ADA/A117.1` | Accessibility standards may be at issue |
+| `STAIR/RISER/HANDRAIL` | Stair, step, riser, landing, or handrail referenced in incident |
+| `SPOLIATION` | Evidence destroyed, overwritten, or unavailable |
```

---

## Gap 18: VOICE.md Section 19 (Open Items) does not track Tier 1 fix dependencies

**File:** `VOICE.md`
**Line(s):** ~442-460 (Section 19)
**Issue:** Section 19 lists unresolved items from benchmark analysis but does not reference the 15 Tier 1 pressure test findings that directly affect VOICE.md content (T1-09 NEVER USE expansion, T1-10 "payment of attention" reclassification, T1-11 limitation disclosure). These should be tracked here as pending updates.

**Patch:**
```diff
 - [ ] Any terminology that's changed over time (earlier reports vs. recent ones)
 - [ ] TCDS credential — full form and when it applies (Traffic Crash Data Specialist assumed; confirm)

+**Pending from 26 March Pressure Test (Tier 1):**
+- [ ] T1-09: NEVER USE list expansion — "accident" (unqualified), "slip and fall" (as compound noun). "prior to" added per Lane 28 Mar 2026. Remaining items pending fuller list from Lane + Mariz.
+- [ ] T1-10: "payment of attention" reclassified from ALWAYS USE to CONDITIONAL USE (Block 7 gate).
+- [ ] T1-11: Limitation disclosure language — VOICE.md should contain or reference the verbatim block for surface remediation cases. Currently in `templates/limitation-disclosure.md` only.
+
```

---

## Gap 19: QA Pipeline Skill does not include Tier 1 checks in its audit criteria

**File:** `.claude/skills/qa-pipeline/SKILL.md`
**Line(s):** ~34-35
**Issue:** The QA Pipeline skill mentions "Escalation logic alignment across QA agent, pipeline, and pressure test" but does not include specific verification of Tier 1 fix integration (e.g., checking that mandatory fields exist, HANDOFF GATE is present, escalation threshold is >3).

**Patch:**
```diff
 - Escalation logic alignment across QA agent, pipeline, and pressure test
+- Tier 1 pressure test fix integration: verify all 15 fixes are reflected in agent specs
+  - Intake: mandatory field minimums, litigation timeline completeness, SPOLIATION flag, STAIR flag, structured defendant
+  - Research: nevada-code-table.md reference, ADA protocol, STAIR protocol, HANDOFF GATE template
+  - Drafting: embedded NEVER USE list, Block 7 conditional gate, limitation disclosure trigger
+  - QA: escalation threshold >3, benchmark load verification, Checks 11-12 present
```

---

## Gap 20: Research Agent does not reference the CXLT fallback file

**File:** `agents/research/BlackBar-Research.md`
**Line(s):** ~63-83 (FLAG: CXLT REGISTRY)
**Issue:** The CXLT lookup protocol says "Check the public CXLT Registry" but has no fallback instruction if the site is unreachable. The reference file `reference/cxlt-fallback.md` exists but is not referenced. Pressure test Finding 3 flags this: "No error state for website unavailability."

**Patch:**
```diff
 If not found in registry: "Not found in public CXLT Registry as of [date]. Research Agent cannot confirm any XL tribometer certification."
+
+**Fallback Protocol (if CXLT registry is unreachable):**
+1. Attempt the live lookup at exceltribometers.com (or current URL).
+2. If the site returns an error, timeout, or is otherwise unreachable:
+   a. Check `/BLACK-BAR/reference/cxlt-fallback.md` for an offline snapshot.
+   b. If snapshot contains the expert, use that data with the flag: `[CXLT: OFFLINE SNAPSHOT — [snapshot date] — VERIFY BEFORE FILING]`
+   c. If snapshot does not contain the expert: `CXLT STATUS: UNABLE TO VERIFY — registry unreachable, expert not in offline snapshot. MANUAL VERIFY REQUIRED.`
+3. In all fallback cases, set HANDOFF GATE field 2 to `MANUAL VERIFY REQUIRED`.
```

---

## Summary

| Tier 1 Fix | Files Requiring Changes | Current Status |
|------------|------------------------|----------------|
| T1-01 (Mandatory intake fields) | Intake Agent, PIPELINE.md | NOT INTEGRATED |
| T1-02 (Litigation timeline) | Intake Agent | PARTIALLY PRESENT — missing court designation + rules |
| T1-03 (SPOLIATION flag) | Intake Agent, PIPELINE.md, README.md | NOT INTEGRATED |
| T1-04 (STAIR flag) | Intake Agent, Research Agent, README.md | NOT INTEGRATED |
| T1-05 (Structured defendant) | Intake Agent | NOT INTEGRATED |
| T1-06 (NV code table) | Research Agent | NOT INTEGRATED — stub file exists but agent does not reference it |
| T1-07 (ADA/A117.1 protocol) | Research Agent | NOT INTEGRATED — stub file exists but agent has no resolution protocol |
| T1-08 (Research handoff gate) | Research Agent, Drafting Agent, PIPELINE.md | NOT INTEGRATED |
| T1-09 (NEVER USE expansion) | VOICE.md, Drafting Agent | PARTIALLY INTEGRATED in VOICE.md — not embedded in Drafting Agent |
| T1-10 (Block 7 conditional) | Research Agent, Drafting Agent | NOT INTEGRATED in agents — template file exists at templates/ |
| T1-11 (Limitation disclosure) | Drafting Agent, QA Agent | NOT INTEGRATED in agents — template file exists at templates/ |
| T1-12 (QA escalation >3) | QA Agent, PIPELINE.md | NOT INTEGRATED |
| T1-13 (Benchmark load verify) | QA Agent | NOT INTEGRATED |
| T1-14 (Check 11: Opinion Sufficiency) | QA Agent | NOT INTEGRATED |
| T1-15 (Check 12: Internal Consistency) | QA Agent | NOT INTEGRATED |

**Cross-cutting gaps (not fix-specific):**
| Gap | Files | Status |
|-----|-------|--------|
| README.md status contradicts NO-GO | README.md | NOT UPDATED |
| VOICE.md Section 19 missing Tier 1 tracking | VOICE.md | NOT UPDATED |
| QA Pipeline Skill missing Tier 1 criteria | .claude/skills/qa-pipeline/SKILL.md | NOT UPDATED |
| Research Agent INPUTS section missing reference files | Research Agent | NOT UPDATED |
| CXLT fallback not wired into Research Agent | Research Agent | NOT UPDATED |

**Total patches in this report:** 27 discrete insertion/modification points across 9 files.
