# BlackBar Agent Team — Pre-Production Pressure Test
**Date:** 26 March 2026
**Session Owner:** Caleb Swainston
**Conducted via:** Claude Code — multi-agent parallel review
**Status:** FINDINGS COMPLETE — TIER 1 FIXES REQUIRED BEFORE LIVE PRODUCTION

---

## TEAM COMPOSITION

| Role | Persona | Target Agent |
|------|---------|-------------|
| Team Lead | Lane Swainston (VOICE.md) | Synthesis & GO/NO-GO |
| QA Subagent 1 | Senior Litigation Support Specialist / Paralegal, 25 yrs Nevada | Intake Agent |
| QA Subagent 2 | Licensed Construction Attorney / Nevada CBO, 28 yrs | Research Agent |
| QA Subagent 3 | Forensic Linguist / Legal Admissibility Consultant, 20 yrs | Drafting Agent |
| QA Subagent 4 | Systems QA Architect, Regulated-Output Environments, 22 yrs | QA Agent |

---

## COMMANDER'S VERDICT

**NO-GO FOR LIVE PRODUCTION.**

Eleven BLOCKING issues across four agents. Any one is sufficient to produce a report Lane cannot sign. Fix Tier 1 before first live case. First live case should run with Lane reviewing every stage output before handoff — not after QA only.

---

## TIER 1 — FIX BEFORE FIRST LIVE CASE

| # | Agent | Fix |
|---|-------|-----|
| 1 | Intake | Define mandatory fields for `INTAKE COMPLETE: YES`. Minimum: incident date, defendant legal name (not DBA), specific incident location, alleged mechanism, report type, at least one document confirmed received. |
| 2 | Intake | Add Litigation Timeline block: complaint filed date, plaintiff expert disclosure deadline, defense expert disclosure deadline, trial date, court designation (USDC vs. Eighth Judicial District), applicable rules (FRCP 26 vs. NRCP 16.1). |
| 3 | Intake | Add SPOLIATION flag. Any indication of destroyed/overwritten evidence = BLOCKING open item immediately, regardless of other completeness status. |
| 4 | Intake | Add STAIR/RISER/HANDRAIL Research Flag. Triggered by any stair, step, riser, landing, or handrail reference in incident location or mechanism. |
| 5 | Intake | Convert Defendant to structured list. Fields: entity type, state of formation, DBA status, Property Owner of Record (separate from Named Defendant), SCG Retention Scope. |
| 6 | Research | Build hard-coded Nevada jurisdiction code table with actual ordinance effective dates. Include UBC 1982, 1985, 1988, 1991, **and 1997** editions. Remove "Post-2000 IBC cycles" as a blanket statement — each jurisdiction adopts independently. Verify Clark County, City of Las Vegas, Henderson, North Las Vegas, and unincorporated Clark County separately. **Do not build this table from agent output alone — verify against Clark County Development Services records or a licensed Nevada CBO.** |
| 7 | Research | Add full ADA/A117.1 flag resolution protocol: (a) jurisdiction trigger (ADA effective dates), (b) applicable A117.1 edition mapping, (c) surface provisions with dimensional thresholds (Sections 302/303), (d) IBC interaction, (e) alteration trigger. Output a separate ADA DETERMINATION block. |
| 8 | Research | Add HANDOFF GATE template to Research Brief. Five required fields before handoff is valid: (1) Code determination — RESOLVED or UNRESOLVED with reason. (2) CXLT lookup — CONFIRMED REACHABLE or MANUAL VERIFY REQUIRED. (3) Surveillance — COMPLETE or BLOCKING. (4) VOICE.md version/date stamp. (5) All open items categorized BLOCKING vs. NON-BLOCKING. Drafting Agent must not proceed until all BLOCKING items are resolved. |
| 9 | Drafting | Expand NEVER USE list. Add immediately: "unreasonably dangerous" \| "reasonable care" \| "reasonable person" \| "fault" \| "victim" \| "safe" / "unsafe" (standalone adjectives) \| "causation" (without physical/mechanical modifier) \| "clearly" / "obviously" (standalone intensity modifiers) \| "slip and fall" (unhyphenated) \| "accident" (unqualified). |
| 10 | Drafting | Convert Block 7 (NSC Distracted Walking / contributory negligence framing) to CONDITIONAL. Requires `[CONTRIBUTORY NEGLIGENCE AUTHORIZED BY COUNSEL: YES]` in Research Brief before insertion. Remove "payment of attention" from ALWAYS USE list — move to CONDITIONAL USE. |
| 11 | Drafting | Add LIMITATION DISCLOSURE block. Triggered when Research Brief indicates surface was remediated prior to SCG inspection. Verbatim, non-negotiable. Sample language: "SCG notes that the subject surface was [repaired/replaced] prior to SCG's inspection date of [date]. SCG's measurements reflect the surface condition as of that date. SCG cannot confirm the surface condition was identical at the time of the alleged incident. SCG's opinions are based on the surface as inspected and the physical evidence available in the record." |
| 12 | QA | Revise escalation threshold: `>3 blocking issues` (not >5). Add mandatory escalation triggers regardless of total count: (a) any Check 10 fact discrepancy on venue, date, or attorney; (b) any Check 6 failure; (c) any Check 5 failure on mandatory boilerplate blocks; (d) benchmark PDF load failure; (e) Check 9 ❌ FAIL on Conclusion section. |
| 13 | QA | Add benchmark load verification step before Check 9 executes. Output: `BENCHMARK STATUS: Gleason [LOADED/FAILED] / Heagy [LOADED/FAILED] / Anderson [LOADED/FAILED]`. If any FAILED → Check 9 = SUSPENDED, escalate immediately. No scores against an unverified or failed load. |
| 14 | QA | Add Opinion Sufficiency check (new Check 11): for each paragraph in Points of Opinion, confirm (a) the paragraph expresses a conclusion, not a factual observation; (b) confidence language is present ("within a reasonable degree of professional certainty" or equivalent); (c) conclusion is explicitly linked to at least one document in the Documentation List. |
| 15 | QA | Add Internal Consistency check (new Check 12): extract alleged mechanism from Incident Details; verify every Points of Opinion analysis is responsive to that mechanism. Verify venue name and incident date are identical across all sections and the Documentation List. |

---

## TIER 2 — FIX WITHIN FIRST SPRINT AFTER LIVE RUN

| Agent | Fix |
|-------|-----|
| Intake | Add conflict-detection rule: when two sources provide different values for the same field, preserve both, mark CONFLICT: UNRESOLVED, add to Open Items with source citations. Distinct from a missing field. |
| Intake | Add multi-plaintiff and wrongful death handling. Wrongful death: Case Type = Wrongful Death, mandatory sub-fields (Decedent Name, Date of Death, Cause of Death alleged). Caption: "Estate of [Decedent] by and through [Personal Rep]" — flag for attorney confirmation. |
| Intake | Categorize Open Items as BLOCKING / HIGH / ROUTINE. Flat lists with no priority are operationally useless at volume. |
| Intake | Add MULTI-EXPERT COORDINATION flag (triggered when other defense expert identified) and PHOTOGRAMMETRY flag (triggered when 3D scan, Matterport, LiDAR, or scene reconstruction appears in intake or opposing expert report). |
| Intake | Add OSHA/REGULATORY flag. Field: "Regulatory Investigation: Yes/No/Unknown." Any regulatory investigation = HIGH priority open item. |
| Intake | Add LIGHTING ANALYSIS Research Flag. Triggered by any reference to lighting, visibility, or illumination in mechanism or opposing expert claims. |
| Intake | Add Retention Type field: Testifying Expert / Non-Testifying Consultant. Consulting-only cases do not produce FRCP 26(a)(2)(B) disclosures. Must be captured at intake. |
| Intake | Add Expert File Status block: CV current (Y/N/unknown), publications list current, prior testimony list last updated, compensation rate confirmed. Flag unknowns as Open Items. |
| Research | Rewrite boilerplate block selection as explicit IF-THEN rules per block, not narrative "reason." Conditions must reference: opposing expert identity, instrument type used by plaintiff, instrument type used by defense, surface type, whether site inspection was performed. |
| Research | Add case-type Section Plan overlays: Stair Cases, ADA Primary Theory, Fire/Egress Cases, Multi-Phase Investigation, Multiple Falls/Prior Incident History, Exemplar-Only Methodology. Each overlay modifies the Section Plan structure. |
| Research | Add OSHA and NFPA 101 flag resolution protocols. Each with applicability trigger and STANDARD DETERMINATION output block. |
| Research | Add name-normalization step to CXLT lookup: generate three name variants before querying (full legal name, last/first-initial, publication name). If results differ, flag for manual review. |
| Drafting | Add two-tier pronoun rule: "we/our" for analytical and review acts (reviewed, analyzed, concluded). "[Name] conducted" or "the site inspector" required for physical acts performed by a specific individual (walked, measured, photographed, held the tribometer). |
| Drafting | Add tiered "alleged" protocol: "alleged/reportedly" reserved for Plaintiff's characterizations of causation and subjective experience. "Subject incident" (unqualified) appropriate for events corroborated by objective evidence (surveillance, SCG photos, measurements). Never attach "alleged" to SCG's own findings. |
| Drafting | Restrict dismissal language: "theoretical and not grounded in the physical reality," "idealized and impractical standards," "outcome-based reasoning" must be preceded in the same paragraph by a specific SCG measurement or physical finding that supports the characterization. Never open a paragraph. Never appear as boilerplate. |
| Drafting | Add multi-expert labeling protocol: when more than one Plaintiff expert is involved, label as "Plaintiff's [Discipline] Expert" (e.g., "Plaintiff's Biomechanics Expert"). Never collapse multiple Plaintiff experts under single "Plaintiff Expert" label. |
| Drafting | Restrict "The record does not indicate": must be supported by an explicit Research Brief entry confirming absence after exhaustive review. Never insert as boilerplate. If Research Brief does not confirm absence, substitute: "SCG was not provided documentation reflecting [X]." |
| QA | Replace Check 9 subjective standard with attribute-scoring rubric: voice ratio (we/our vs. I/my per section), assertion density (hedged vs. direct statements), sentence length distribution, technical vocabulary consistency, over-explanation flag, aggression ceiling vs. evidentiary support. |
| QA | Add citation inventory output: list every regulatory code, standard number, and published reference cited in the report. Flag complete list for Lane/Mariz manual verification. |
| QA | Add section-level severity cross-map to QA Report: findings mapped to sections (Qualifications / Incident Details / Points of Opinion / Conclusion / Documentation List) and sorted by section, then severity. Not check order — section order. |
| QA | Add credential accuracy check on Qualifications section: compare Lane and Mariz credential statements against canonical VOICE.md block. Flag any credential listed in one place but absent in the other. |
| QA | Add retention scope check for rebuttal matters: verify every opinion in Points of Opinion explicitly names the opposing expert opinion it rebuts. Flag any affirmative opinion not tied to a specific opposing expert opinion. |
| QA | Add systemic failure classification to escalation output: DISCRETE (enumerable errors, targeted revision) / PATTERN (same error type across multiple sections) / SYSTEMIC (fundamental voice/structure/opinion framing failure, return to Drafting Agent with re-prompt instructions). |

---

## FULL AGENT REPORTS

---

### REPORT 1 — INTAKE AGENT PRESSURE TEST
*Evaluator: Senior Litigation Support Specialist / Paralegal, 25 years Nevada premises liability defense*

#### Legal / Evidentiary Gaps

**1.1 — Statute of Limitations / Litigation Timeline Not Captured** 🔴 BLOCKING
Schema captures incident date but not complaint filing date, service date, or discovery cutoff. Expert disclosure deadlines are not captured. A rebuttal report with an imminent response deadline cannot be flagged by this agent. Under NRS 11.190(4)(e), the 2-year SOL for premises liability is a threshold fact. Court designation (USDC vs. Eighth Judicial District) is absent — this determines which expert disclosure rules apply (FRCP 26 vs. NRCP 16.1).

**1.2 — Defendant Entity Type / Legal Standing Not Captured** 🔴 BLOCKING
Schema asks for "defendant full legal name" but no entity type (LLC, LP, corporation), state of formation, or DBA relationships. A casino operating under a DBA trade name will produce a wrong caption if the attorney feeds in the trade name. No instruction to flag DBA ambiguity.

**1.3 — Property Control / Management Split Not Captured** 🔴 BLOCKING
Nevada premises liability cases frequently involve multiple entities — property owner, tenant, janitorial contractor. No field for who owned, managed, or maintained the specific incident location. No co-defendant structure. An agent that marks INTAKE COMPLETE: YES on a case with a management split will send the Research Agent looking for the wrong entity's code compliance history.

**1.4 — Injury Claimed / Causation Theory Not Captured** 🔴 BLOCKING
FRCP 26(a)(2)(B)(i) requires a complete statement of all opinions and the basis for them. The schema captures incident type and alleged mechanism but not the nature of injuries alleged, medical causation theory, or whether a biomechanical or medical expert is on plaintiff's side. A wrongful death case gets no special treatment.

**1.5 — Prior Incidents / Notice Evidence Not Captured** 🟡 HIGH
No field for prior incidents at the same location, maintenance request history, incident logs, or prior claims from the same condition. Notice is the single most important factual issue in premises liability defense.

**1.6 — FRCP 26(a)(2)(B) Expert File Status Not Mapped** 🟡 HIGH
CV current, publications list, prior testimony list (4 years), compensation disclosure — none captured at intake. Plaintiff counsel attacks expert disclosures specifically on stale prior testimony lists.

#### Ambiguity Failures

**2.1 — "Alleged Mechanism" Is Undefined** 🔴 BLOCKING
No parsing rules for mechanism. "Client slipped" produces no actionable code lookup trigger. The Research Agent downstream will not know which code section to pull.

**2.2 — "Document List Formatting Per SCG Rules" — Rules Not in Prompt** 🔴 BLOCKING
The agent is told to follow "SCG rules (semicolons, prefixes)" but those rules are not embedded. Cannot follow a standard it cannot see.

**2.3 — Date Normalization — No Handling for Partial or Conflicting Dates** 🟡 HIGH
No instruction for: "sometime in January," conflicting dates from two sources, or time zone ambiguity for overnight casino incidents.

**2.4 — Plaintiff Expert Flag Trigger Condition Undefined** 🟡 HIGH
"Plaintiff Expert flags trigger CXLT REGISTRY" but no definition of what constitutes a flag. Named but no report received? Anticipated but not yet designated?

**2.5 — Case Caption Rule Fails on Multi-Plaintiff and Wrongful Death** 🟡 HIGH
"[Defendant] adv [Plaintiff Surname]" breaks on multiple plaintiffs, estates/personal representatives, and "et al." defendants.

#### Edge Cases Not Handled

**3.1 — Co-Defendant Scenarios** 🔴 BLOCKING
Single defendant field. No handling for multiple named defendants, cross-claims, third-party complaints, or which defendant(s) have retained SCG.

**3.2 — Wrongful Death / Survival Action Distinction** 🔴 BLOCKING
NRS 41.085 wrongful death and survival actions are procedurally different. No case type field. A wrongful death case enters the pipeline as a standard slip-and-fall.

**3.3 — Rebuttal Against Multiple Plaintiff Experts** 🟡 HIGH
Single opposing expert block. A case with a premises expert and a biomechanical expert will have the second expert silently truncated.

**3.4 — Supplemental Trigger Not Captured** 🟡 HIGH
No field for what changed to require supplementation (new evidence, deposition testimony, new expert designation, changed site conditions).

**3.5 — Conflicting Input from Multiple Sources** 🟡 HIGH
No conflict-detection rule. Attorney email vs. police report with different incident dates produces silent resolution rather than a flagged CONFLICT.

**3.6 — Expert Retained as Consultant vs. Testifying Expert** 🟡 HIGH
No Retention Type field. A consulting engagement that enters as a testifying report pipeline produces a disclosable document that was never authorized.

#### Research Flag Gaps

**4.1 — STAIR/RISER/HANDRAIL Flag Missing** 🔴 BLOCKING
IBC Chapter 10/Section 1011, A117.1 Section 504 analysis requires a dedicated flag, not a generic CODE LOOKUP.

**4.2 — PHOTOGRAMMETRY Flag Missing** 🟡 HIGH
Increasingly common in Clark County cases. No flag when opposing expert report references Matterport, LiDAR, or scene reconstruction.

**4.3 — OSHA/REGULATORY INVESTIGATION Flag Missing** 🟡 HIGH
An OSHA citation for the same condition at issue is near-fatal for the defense. Must be surfaced at intake.

**4.4 — LIGHTING ANALYSIS Flag Missing** 🟡 HIGH
IBC Section 1008, IESNA standards — distinct code pathway not triggered by generic CODE LOOKUP or ADA flag.

**4.5 — SPOLIATION Flag Missing** 🔴 BLOCKING
Surveillance deleted or overwritten. Physical evidence destroyed. Fundamentally changes research scope. Entirely absent from flag set.

**4.6 — MULTI-EXPERT COORDINATION Flag Missing** 🟡 HIGH
No flag when other defense experts are retained. Plaintiff counsel puts all defense reports side by side at deposition looking for contradictions.

#### Handoff Risk (INTAKE COMPLETE: YES Failures)

**5.1 — No Minimum Completeness Standard** 🔴 BLOCKING
Agent can mark YES while missing the incident date, defendant legal name, and site visit data — as long as those are faithfully listed as MISSING in Open Items. There is no required minimum set.

**5.2 — Open Items Not Prioritized** 🟡 HIGH
Flat list with no priority signal. A missing defendant middle name and a missing incident date look identical.

**5.3 — "Documents Received" Complete in Structure, Incomplete in Substance** 🟡 HIGH
No "Expected But Not Received" sub-field. Agent will not flag the absence of an incident report, ownership records, or maintenance logs.

**5.4 — Research Flags Are Binary — No Confidence Signal** 🟡 HIGH
CONFIRMED (data in hand) vs. ANTICIPATED (named, not received) vs. UNKNOWN look identical in the current flag structure.

#### Nevada-Specific Gaps

**6.1 — Nevada Building Code Version Not Captured** 🔴 BLOCKING
No capture of which IBC cycle was in effect for the construction/permit year in the specific jurisdiction. Research Agent cannot run a reliable CODE LOOKUP without this.

**6.2 — Clark County Business License / Entity Verification Not Flagged** 🟡 HIGH
Publicly searchable. Should be triggered for all commercial defendants.

**6.3 — Nevada Non-Party At Fault Designation Not Captured** 🟡 HIGH
NRS 41.141 — defendants routinely designate non-parties. Expert may need to address that party's conduct.

**6.4 — Nevada vs. Federal Court Expert Deadline Rules** 🟡 HIGH
NRCP 16.1 vs. FRCP 26 — deadline miscalculation is malpractice exposure. Court not captured.

**6.5 — Nevada Gaming Resort Specifics** 🟡 HIGH
No Venue Category field. Gaming Resort properties have unique characteristics (controlled lighting, intentional floor patterns, 24-hour operations, NV Gaming Commission surveillance retention policies) not captured anywhere.

---

### REPORT 2 — RESEARCH AGENT PRESSURE TEST
*Evaluator: Licensed Construction Attorney / Certified Building Official, 28 years Nevada*

#### Finding 1 — Code Determination Failures 🔴 BLOCKING

The protocol states: "Pre-1992 UBC (1988 or earlier); 1992-2000 jurisdiction-dependent; Post-2000 IBC cycles." This is factually incomplete and will produce wrong citations.

- **"Jurisdiction-dependent" is not actionable.** An AI agent cannot resolve this without an actual table.
- **1997 UBC is entirely omitted.** Clark County used the 1997 UBC for permit years approximately 1998-2003 before transitioning to IBC. A permit year of 2000 in Clark County may require the 1997 UBC — not IBC 2000. This is an impeachable citation error.
- **"1988 or earlier" is wrong as a cutoff.** UBC editions 1982, 1985, 1988, and 1991 were all in use in Nevada depending on permit year and jurisdiction.
- **Nevada has no statewide IBC adoption mandate.** Every jurisdiction adopts independently. Clark County, City of Las Vegas, Henderson, and North Las Vegas each have independent adoption ordinances with different effective dates.
- **Permit year vs. Certificate of Occupancy distinction not addressed.** A permit issued in year X with a C.O. in year X+2 may cross a code adoption boundary.

**Note to system owner:** Do not build the Nevada jurisdiction code table from AI agent output alone. Verify actual ordinance effective dates against Clark County Development Services records or a licensed Nevada CBO.

#### Finding 2 — Standards Gaps

**ADA / ICC A117.1 — No Resolution Protocol** 🔴 BLOCKING
Listed as a flag but entirely empty. Required protocol elements:
1. Jurisdiction trigger (ADA effective dates — new construction July 26, 1990; existing facilities Title III January 26, 1992)
2. Edition mapping — A117.1 1998/2003/2009/2017 have material differences on floor surface requirements
3. Surface provisions — Section 302 (floor surfaces) and Section 303 (changes in level) dimensional thresholds
4. IBC interaction — ADA is federal floor; IBC may be more stringent on some elements
5. Alterations trigger — post-construction alterations create new ADA compliance obligations for the altered path of travel

**OSHA Standards — No Flag, No Protocol** 🟡 HIGH
29 CFR 1910.22 (walking-working surfaces) and 1926.502 (construction fall protection) are frequently cited by plaintiff experts. No protocol to assess applicability or challenge OSHA standard misapplication.

**NFPA 101 Life Safety Code — No Flag, No Protocol** 🟡 HIGH
NFPA 101 contains egress path requirements overlapping with falls in exit corridors, stairwells, and exit discharge paths. Nevada has adopted by reference in certain contexts.

#### Finding 3 — CXLT Registry Protocol Weakness 🟡 HIGH

- **No error state for website unavailability.** An unreachable site produces "NOT FOUND" that looks identical to a genuine not-found result.
- **Name variation not handled.** "John R. Peterson" vs. "John Peterson" vs. "J.R. Peterson" — no name-normalization step.
- **Output insufficient for credential attack.** Missing: certification level claimed vs. held, lapse period calculation, whether expert disclosed status in their report.

#### Finding 4 — Boilerplate Selection Logic 🟡 HIGH

YES/NO with a narrative "reason" is not a machine-executable rule. An AI agent applies inferred heuristics. Key ambiguous conditions:
- "If BOT-3000E used OR if opposing expert attacks instruments" — two distinct conditions requiring potentially different blocks
- Blocks tied to Peterson Playbook are not conditioned on opposing expert identity in the selection grid
- No VOICE.md version reference in Research Brief — block numbers may map to wrong content if VOICE.md has been updated

#### Finding 5 — Section Plan Gaps 🟡 HIGH

No overlays for: Stair cases, ADA primary theory, Fire/egress cases, Multi-phase investigations, Multiple falls/prior incidents, Exemplar-only methodology (when site access is denied or surface is altered).

#### Finding 6 — Handoff Quality Control 🔴 BLOCKING

No quality gate on the Research → Drafting handoff. A Research Brief can pass as complete with:
- Unresolved code determination (silently outputs best-guess citation)
- Failed CXLT lookup indistinguishable from confirmed NOT FOUND
- Pending surveillance marked as a note, not a hard stop
- No VOICE.md version verification

#### Finding 7 — Nevada Code Specifics 🟡 HIGH

- "1988 or earlier" as a UBC cutoff is wrong — 1991 UBC was in use
- 1997 UBC entirely absent
- Nevada State Fire Marshal adopts fire codes independently of local building code adoption
- "Post-2000 IBC cycles" implies uniform statewide adoption — Nevada has no such mandate

---

### REPORT 3 — DRAFTING AGENT PRESSURE TEST
*Evaluator: Forensic Linguist / Legal Admissibility Consultant, 20 years Nevada premises liability*

#### Finding 1 — Daubert/Kumho Vulnerability

**1a — "I" Prohibition Creates False Attribution Risk** 🟡 HIGH
The institutional "we" has no antecedent in many passages. Under *Kumho Tire Co. v. Carmichael*, 526 U.S. 137 (1999), the court scrutinizes whether the specific expert applied their specific methodology reliably. When a report reads "we conducted the site inspection" and Lane was the only one on site, opposing counsel builds a clean impeachment sequence from that false attribution. NRS 50.275 requires reliable application of methodology to the specific facts — a report where the authoring entity is institutional but the methodology was executed by one individual creates a methodology reliability gap.

**1b — Excessive "Alleged" Qualifier Pattern** 🟡 HIGH
Three failure modes: (1) Undisputed objective facts get "allegedly" attached, undermining scientific credibility when the fall is on video. (2) Cumulative "alleged" reads as advocacy rather than rigor — plaintiff's attorney reads the count to the jury. (3) Under NRS 50.275, an expert who will not adopt any factual predicate as established creates a logical trap: "If you won't accept that a fall occurred, on what factual basis are you opining about the surface condition?"

**1c — Polite Dismissal Language Lacks Evidentiary Anchor** 🔴 BLOCKING
"Theoretical and not grounded in the physical reality," "idealized and impractical standards," "outcome-based reasoning" are conclusory characterizations without an evidentiary anchor. Under Nevada Supreme Court analysis in *Hallmark v. Eldridge* (cited — **verify citation**), expert testimony must assist the trier of fact through specialized knowledge, not rhetorical dismissal. These phrases as boilerplate precede evidence rather than follow it. If Lane inserts this language before citing the specific SCG measurement that contradicts the plaintiff expert's position, the conclusion is a non-sequitur in a filed report.

#### Finding 2 — Prohibited Language Gaps 🔴 BLOCKING

Current NEVER USE list is missing nine terms that are legal conclusions or advocacy language:

| Term | Why It Must Be Prohibited |
|------|--------------------------|
| "Unreasonably dangerous" | Legal conclusion under *Foster v. Costco* (cited — **verify citation**); reserved for jury |
| "Reasonable care" / "reasonable person" | Legal negligence standard — jury's determination, not expert's |
| "Causation" (unqualified) | Legal conclusion; substitute "physical contributing factor" |
| "Safe" / "unsafe" (standalone) | Legal conclusion; substitute measured value against named standard |
| "Fault" | Exclusively a legal conclusion |
| "Victim" | Signals plaintiff narrative bias; use "Plaintiff" or "Claimant" |
| "Clearly" / "obviously" (standalone intensity) | Conclusory and argumentative without "open and obvious" legal framework anchor |
| "Accident" (unqualified) | Implies unforeseeable random event; use "alleged accident" or "subject incident" |
| "Slip and fall" (unhyphenated) | Currently only the hyphenated form is prohibited; both forms should be prohibited |

#### Finding 3 — Boilerplate Insertion Risks

**3.1 — Block 3 CXLT Data — Unfilled Variable Risk** 🔴 BLOCKING
Verbatim insertion of Block 3 without populating actual CXLT certificate number, calibration date, and device serial is a material misrepresentation about instrument reliability. Discovery will produce the actual calibration records. If they don't match, Lane faces an impeachment at the core of ANSI A326.3 compliance testimony. Block 3 must be FILL-REQUIRED with bracketed placeholders that cannot be missed.

**3.2 — Block 7 NSC Distracted Walking — Litigation Strategy Decision** 🔴 BLOCKING
Block 7 introduces comparative fault framing under NRS 41.141. Defense counsel may or may not want this in a given matter — it can anger a jury when used incorrectly. An AI agent is not authorized to make this call. Block 7 must require explicit counsel authorization in the Research Brief before insertion.

**3.3 — Boilerplate in Multi-Defendant Cases** 🟡 HIGH
Boilerplate written for single-defendant posture will assign maintenance responsibility ambiguously when multiple defendants share the caption. Co-defendant's counsel will treat SCG's language as an argument about which party was responsible for sweeps.

**3.4 — Header Formatting: "Underlined Only" Is Not Markdown-Native** 🟢 LOW
AI agents output markdown natively. Underline is not a standard markdown element. The QA Agent reviewing plain text cannot verify that underlining was applied. Establish an explicit markup convention (e.g., `===HEADER: Title===`) that the formatting layer converts.

#### Finding 4 — Institutional vs. Personal Testimony Tension 🟡 HIGH

Deposition sequence opposing counsel will use when only Lane inspected:

> Q: "This report says 'we conducted a site inspection.' Who is 'we'?"
> A: "SCG."
> Q: "Who physically walked the site?"
> A: "I did."
> Q: "Was Mariz present?"
> A: "No."
> Q: "So 'we' meant one person?"

This is not a Daubert challenge — it is a honesty challenge in front of a jury. Required fix: two-tier pronoun rule. "We/our" for analytical and review acts. "[Name] conducted" or "the site inspector" for physical acts performed by a specific individual.

#### Finding 5 — Missing Voice Rules

**5a — Single-Inspector Protocol** 🔴 BLOCKING
No rule for the common case where only one expert conducted the site visit. The mandatory field in Research Brief: `[SITE INSPECTOR(S): Lane / Mariz / Both]`. If one person only, single-inspector voice applies throughout physical observation passages.

**5b — Prior Testimony Consistency Protocol** 🟡 HIGH
No mechanism to flag when Lane has prior sworn testimony on the same surface type. Inconsistent standards across matters = deposition impeachment.

**5c — ADA Compliance Opinion Protocol** 🟡 HIGH
ADA compliance opinions require a different credentialing anchor than tribometry. "The ramp complied with ADA" is a mixed legal-technical statement that must be expressed as compliance with specific dimensional requirements, not a general ADA determination.

**5d — Acknowledged Limitation Protocol** 🔴 BLOCKING
No uncertainty handling exists. An expert who never acknowledges any limitation is not credible to a sophisticated trier of fact or a federal judge conducting Daubert review. When surface was remediated before SCG inspection, the report must say so — this is not hedging, it is scientific accuracy that strengthens credibility.

#### Finding 6 — Section Header Formatting Gap 🟢 LOW
See Finding 3.4.

#### Finding 7 — Voice Consistency Under High-Complexity Input 🟡 HIGH

Most likely to fail first under 40+ page opposing expert input, in order:
1. "Alleged" qualifier — agent will begin mixing qualified and unqualified incident references internally
2. Plaintiff Expert italics rule — agent will drop italics on some quotes, apply to paraphrases
3. Single "Plaintiff Expert" label in multi-expert cases — agent collapses multiple experts
4. European date format — inconsistency under complex date sets
5. "The record does not indicate" — agent inserts without verifying absence from record

---

### REPORT 4 — QA AGENT PRESSURE TEST
*Evaluator: Systems QA Architect, Regulated-Output Environments, 22 years*

#### Section 1 — False Confidence Gaps

**Check 5 — Boilerplate Block Integrity** 🔴 BLOCKING
"Verify verbatim insertion" requires the canonical boilerplate text to be in-context at the moment of comparison. If the agent is comparing against its own memory of the boilerplate, subtle paraphrases ("Thank you for the opportunity to assist" vs. "Thank you for this opportunity to assist you") may produce a false PASS.

**Check 6 — Conclusion Boilerplate Integrity** 🔴 BLOCKING
Four sub-criteria handled as a single check. Agent can confirm three of five and call it PASS. TCDS credential drop is a specific risk — agent confirms "Mariz present" and "thank you language present" and marks done.

**Check 3 — "Alleged" Language** 🟡 HIGH
Positive match list approach: checks only for phrases thought of in advance. Unqualified incident references in non-standard phrasing ("contact with the flooring surface resulted in..." / "the subject event") pass the list-scan.

**Check 9 — Benchmark Comparison** 🔴 BLOCKING
See Section 3.

**Check 10 — Fact Accuracy** 🔴 BLOCKING
Six-item cross-reference list treated as exhaustive. Items not named — plaintiff name spelling, defendant entity name, claim type, report date — are not checked. Plaintiff name spelled two different ways due to Drafting Agent hallucination passes Check 10.

#### Section 2 — Missing Checks

**Opinion Sufficiency Check** 🔴 BLOCKING
Completely absent. A report that passes all 10 checks can contain zero expert opinions — only elevated factual recitation. No check asks: does each Points of Opinion paragraph express a conclusion? Is it linked to specific documentation? Does it contain confidence language?

**Internal Consistency Check** 🔴 BLOCKING
Completely absent. Drafting Agent may analyze a wet floor in Points of Opinion after describing an uneven surface in Incident Details. Each section passes its checks in isolation. No cross-section consistency verification.

**Secondary consistency checks also absent:**
- Venue name in Incident Details vs. Documentation List
- Incident date in Incident Details vs. Documentation List citations
- Qualifications section expertise vs. expertise relied upon in Points of Opinion

**Credential Accuracy — Qualifications Section** 🔴 BLOCKING
Check 6 only verifies TCDS in the Conclusion sign-off. No check verifies the full Qualifications section against the canonical VOICE.md credential block. A credential error in Qualifications is impeachable at deposition.

**Citation Integrity Check** 🟡 HIGH
Completely absent. AI drafting agents hallucinate citations. Every regulatory code citation, ASTM standard reference, and published study citation should be inventoried and flagged for human verification before filing.

**Scope Limitation Check** 🟡 HIGH
When retained as rebuttal experts, every opinion must respond to a named opposing expert opinion. No check verifies this. Affirmative opinions that exceed rebuttal scope pass undetected.

**Signature Block and Pagination Check** 🟡 HIGH
Is a signature block present? Is the date line blank (not pre-filled)? Is pagination sequential? Are running headers correct? Completely absent from protocol.

#### Section 3 — Check 9 Failure Modes (Highest Risk Check)

**PDF Load Failure** 🔴 BLOCKING
If benchmark PDF does not load, agent uses training memory of what a forensic report should sound like. This is not calibrated to SCG voice. The failure is invisible — scores look identical whether benchmark was loaded or not.

**Subjectivity Problem** 🔴 BLOCKING
"Could this appear in Gleason without edit?" is not an auditable criterion. Two runs of the same draft can produce different Check 9 scores. Not replicable, not challengeable.

**Granularity Problem** 🟡 HIGH
"⚠️ REVIEW — Points of Opinion, Section 3" tells Lane there is a problem but not what it is. The QA Report has not saved work — it has confirmed work exists without identifying it.

**Recommended replacement:** Decompose benchmark attributes into testable dimensions:
- Voice ratio (we/our vs. I/my count per section)
- Assertion density (hedged statements vs. direct assertions per paragraph)
- Sentence length distribution (flag paragraphs exceeding threshold)
- Technical vocabulary consistency
- Over-explanation flag
- Aggression ceiling vs. evidentiary support

Each attribute gets a binary or 3-point score. Composite score is auditable across runs.

#### Section 4 — Escalation Threshold

**Current threshold ">5 blocking issues" is too permissive** 🔴 BLOCKING

A report can have five confirmed failures on structure, identity, alleged language, date format, and boilerplate — and still go to Lane rather than escalating. This is not QA protecting Lane; it is QA forwarding a defective draft with a cover sheet.

**Recommended revision:**

MANDATORY ESCALATION (any single occurrence, regardless of count):
- Any Check 10 fact discrepancy on venue, date, or attorney
- Any Check 6 failure (Conclusion boilerplate)
- Any Check 5 failure on mandatory boilerplate blocks
- Benchmark PDF load failure
- Check 9 ❌ FAIL on Conclusion section

STANDARD ESCALATION (revised threshold):
- >3 blocking issues across Checks 1-7 (not >5)
- 2+ ❌ FAIL on Check 9 (not 3)

#### Section 5 — Systemic Voice Failure Resolution 🔴 BLOCKING

QA Agent is told "you do not rewrite, you audit." This is correct for discrete failures. It is not correct when the Drafting Agent produced a draft in entirely the wrong voice or structured opinions as narrative summary. The current escalation is binary (escalate / don't escalate). No characterization of failure type.

Required addition — systemic failure classification:
- **DISCRETE:** Specific, enumerable errors. Targeted revision. Low correction time.
- **PATTERN:** Same error type across multiple sections. Pass-level revision.
- **SYSTEMIC:** Fundamental voice/structure/opinion framing failure. Return to Drafting Agent with specific re-prompt instructions.

#### Section 6 — Benchmark PDF Dependency Failures 🔴 BLOCKING

- No-load failure: agent uses generic training knowledge, scores look identical
- Partial-load: corrupted OCR at key sections, agent doesn't know it's comparing against incomplete benchmark
- Misidentification: wrong benchmark loaded due to case type default
- Stale benchmark: a newer filed SCG report has superseded the calibration standard

Required controls:
1. Benchmark load verification as a named, logged step before Check 9
2. Benchmark registry (case type → benchmark file → last-verified date)
3. If any benchmark FAILED: Check 9 = SUSPENDED, not scored
4. Quarterly benchmark currency review or on any new high-quality filed report

#### Section 7 — QA Report Output Format Gaps

**Missing: Side-by-Side Violation Citation** 🔴 BLOCKING
Findings should output: `DRAFT TEXT: [quoted] / RULE: [quoted from VOICE.md] / DELTA: [specific difference]`. Currently produces findings without quoting the controlling rule. Lane/Mariz must open VOICE.md to confirm the agent's interpretation — doubles resolution time per finding.

**Missing: Section-Level Severity Cross-Map** 🟡 HIGH
Findings sorted in check order, not section order. Lane and Mariz work in section order. A blocking error in the Conclusion buried at item 8 of 12 findings is a workflow problem.

**Missing: Revision Complexity Indicator** 🟢 LOW
MECHANICAL (find/replace) / TARGETED (judgment required) / SUBSTANTIVE (paragraph re-draft). Allows Mariz to triage against Lane's time before the review session.

#### Section 8 — Errors That Pass All 10 Checks

These failure modes will not be caught by the current QA protocol:

1. **Correct voice, wrong theory** — Report is well-written, reaches wrong conclusion not supported by the documentation. No check evaluates whether the theory matches the retention scope within evidentiary bounds.
2. **Omitted material findings** — Drafting Agent selects which documents to emphasize. No check verifies that every document's material contents are reflected in the analysis.
3. **Overstated certainty** — Opinions stated with more certainty than documents support. Check 9 "too aggressive without grounding" catches this only if the QA Agent evaluates evidentiary grounding — not explicitly required.
4. **Accurate facts, wrong time sequence** — Every date correct, but cause-and-effect order doesn't match the actual timeline. Passes Check 10 (dates correct) and Check 3 (alleged language present).
5. **Technically correct, professionally inappropriate** — Accurate statement that does not belong in a forensic filing (editorial comment, speculation about plaintiff's motivation). Passes all voice checks.

---

## CONFIDENCE ASSESSMENT

### By Finding Type

| Finding Type | Confidence | Basis |
|-------------|-----------|-------|
| Directly observable structural gaps (read the prompts) | 93–98% | Verified by reading the agent prompts directly |
| Legal principle claims (established law) | 82–90% | Well-grounded frameworks; not a licensed Nevada attorney |
| Nevada-specific code adoption dates | 55–65% | AI agent output on specialized local records — **must be verified against Clark County Development Services** |
| Case citations produced by agents | See below | Varies significantly |
| Design recommendations / proposed fixes | 70–87% | Reasonable design patterns; subjective judgment involved |

### Case Citation Confidence

| Citation | Confidence |
|---------|-----------|
| *Kumho Tire Co. v. Carmichael*, 526 U.S. 137 (1999) | 99% — landmark SCOTUS case |
| NRS 50.275 (Nevada expert testimony standard) | 92% |
| NRS 41.141 (comparative fault) | 95% |
| NRS 41.085 (wrongful death) | 90% |
| NRS 11.190(4)(e) (2-year SOL, premises liability) | 85% |
| FRCP 26(b)(4)(D) (non-testifying consultant protection) | 88% |
| *Hallmark v. Eldridge*, 189 P.3d 646 (Nev. 2008) | **45% — plausible but unverified. Do not use without Westlaw confirmation.** |
| *Foster v. Costco Wholesale Corp.*, 291 P.3d 150 (Nev. 2012) | **50% — plausible but unverified. Do not use without Westlaw confirmation.** |

### Key Call-Outs

- **High confidence (90%+):** The structural gaps observable directly in the prompts. Act on these.
- **Moderate confidence (75–89%):** Legal principle findings. Directionally correct. Validate with defense counsel before locking into agent language.
- **Lower confidence (55–65%):** Nevada-specific code adoption dates. Do not build the code table from this output alone. Verify against actual Clark County and City of Las Vegas building department records.
- **Flag for verification before use:** *Hallmark* and *Foster* citations. Five-minute Westlaw search before citing in any context.

---

## RECOMMENDED NEXT STEPS

1. Implement Tier 1 fixes (15 items) across all four agent prompts.
2. Verify Nevada jurisdiction code adoption dates against Clark County Development Services or a licensed Nevada CBO. Build the code table from verified records, not from this session.
3. Run a dry-run case using the Gleason matter as the test input — benchmark already exists for comparison.
4. First live case: Lane reviews each stage output before handoff to next agent (not after QA only).
5. After first live case: review the filed report for new boilerplate, new attack patterns, new analytical sequences — update VOICE.md per the update protocol.

---

*Session: 26 March 2026 | Claude Code | Caleb Swainston, System Owner*
*This document does not constitute legal advice. Case citations should be independently verified before use.*
