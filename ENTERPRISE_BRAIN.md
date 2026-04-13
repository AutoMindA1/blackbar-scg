# ENTERPRISE_BRAIN.md — BlackBar / Swainston Consulting Group

**Purpose:** Domain knowledge document for the BlackBar 4-agent pipeline. Every agent's Orient step queries this document to ground its output in SCG's actual practice — not generic AI guesses.  
**Version:** 1.0  
**Created:** 2026-03-29  
**Source:** VOICE.md v2.0 (Lane Swainston), 3 benchmark reports, Product Owner context  
**Consumers:** Intake Agent, Research Agent, Drafting Agent, QA Agent  

---

## 1. ORGANIZATION PROFILE

| Field | Value |
|-------|-------|
| Entity name | Swainston Consulting Group (SCG) |
| DBA / trade name | None — always "SCG" or "Swainston Consulting Group" |
| Tagline | Savage Wins |
| Principal | Lane Swainston, CBO, CXLT, TCDS — Principal Consultant |
| Senior Consultant | Mariz Arellano, CXLT — Senior Consultant |
| Domain | Premises liability, construction defect, walkway safety, slip resistance |
| Jurisdiction (primary) | Clark County, Nevada — Clark County District Court |
| Client type | Defense counsel in Nevada premises liability |
| Retention types | Initial expert, rebuttal expert, supplemental expert |
| Entity voice rule | The entity speaks (SCG), not the person — except CBO credentials anchor and "(Lane)" parenthetical |

---

## 2. PERSONNEL & CREDENTIALS

### Lane Swainston
- Certified Building Official (CBO) — ICC, since 1987
- Certified XL Tribometrist (CXLT) — Excel Tribometers, LLC
- Walkway Safety Auditor (ASTM F2948-13) — University of North Texas
- Level I Certified Walking Gait Analyst
- Traffic Crash Data Specialist (TCDS)
- Certified Safety Practitioner — State of Nevada
- ASTM F13 Committee member (walkway safety and footwear)
- Certified Master Aerial Photographer — PAPI
- Certified Craftsman Photographer — MPI
- Sister company: Swainston Digital Imaging (imagery analysis since VHS era)
- 30+ years expert witness testimony, hundreds of site inspections

### Mariz Arellano
- Certified XL Tribometrist (CXLT) — Excel Tribometers, LLC
- B.S. Hotel Administration — University of Nevada, Las Vegas
- Casino/hotel operations background: front desk, housekeeping supervision, guest services
- Operational knowledge of commercial hospitality environments
- [TEMPLATE: years of experience and venue-specific details vary by case]

---

## 3. CASE TAXONOMY

| Case Type | Description | Key Standards | Example |
|-----------|-------------|---------------|---------|
| Slip & fall | Guest slips on floor surface; slip resistance at issue | ANSI A326.3, NFSI B101.1/B101.3, ASTM F2508 | Casino floor, restroom tile |
| Trip & fall | Guest trips on elevation change, carpet, object | IBC/UBC code sections, ADA/ICC A117.1 | Step edge, wheel stop, cord |
| Stair incident | Fall on stairs; riser/tread/handrail at issue | IBC/UBC stair provisions | Hotel stairwell |
| Walkway hazard | Open and obvious condition, lighting, contrast | IBC, ADA, photometric standards | Parking lot, curb, bollard |
| Construction defect | Code compliance of built structure | Permit-date code edition in force | Pool deck, restroom design |
| Surveillance analysis | Video review for notice, spill timeline | SDI methodology, 4-question framework | Casino floor cam footage |

**Jurisdictions served:** Clark County, City of Las Vegas, Henderson, North Las Vegas, Boulder City, State of Nevada

---

## 4. REPORT TYPES & STRUCTURE

### Report Types
1. **Initial Report** — First SCG report after site visit and document review
2. **Rebuttal Report** — Point-by-point or section-by-section response to plaintiff expert
3. **Supplemental Report** — New documents received; additional analysis
4. **Nth Rebuttal / Nth Supplemental** — Subsequent rounds (numbered sequentially)

### Standard Section Sequence (Initial Report — 2025-2026)
1. Qualifications
2. Documentation Reviewed
3. Date & Location of Alleged Accident (OR bullet format variant)
4. Alleged Accident Details (OR Incident Details)
5. [Subject-specific section] — e.g., SCG Surveillance Video Analysis, Inspection/Investigation
6. Points of Opinion
7. Conclusion

### Supplemental Report Variations
- Section 1 becomes "Additional Documentation Reviewed"
- May open directly with "Supplemental Points of Opinion"
- Date/Location section uses bullet format

### Rebuttal Report Structure
- Umbrella header quoting plaintiff expert in italics
- Numbered plaintiff claims → SCG Response per claim
- Section-level responses (SCG Response to the Plaintiff Expert's "[Title]")
- Closing: SCG General Response to Plaintiff Expert [Name]'s Report
- Rebuttal scope limitation block (verbatim — see VOICE.md §8)

---

## 5. VOICE RULES (AGENT DRAFTING CONSTRAINTS)

### Identity
- ✅ "SCG" or "Swainston Consulting Group" — always
- ✅ "The author of this Report" — when personal expertise cited
- ❌ "I" in body text — never (two narrow exceptions: CBO credentials block, instrumentation "(Lane)" parenthetical)

### Date Format
- ✅ European: "15 April 2024" — always
- ❌ American: "April 15, 2024" — never

### Case Naming
- Format: [Defendant entity] adv [Plaintiff surname]
- Report type on second line: "Initial Report" / "Rebuttal Report" / "1st Supplemental Report"

### Certainty Language
- ✅ "within a reasonable degree of certainty"
- ✅ "with a reasonable degree of professional certainty"
- ✅ "based upon a reasonable degree of scientific probability"
- ❌ "clearly" / "obviously" / "undoubtedly" / "certainly" / "unquestionably"

### Prohibited Terms
| Term | Reason | Use Instead |
|------|--------|-------------|
| "I" in body | Entity voice | "SCG" / "The author of this Report" |
| "dangerous condition" | Let facts establish | Describe condition factually |
| "negligent" / "negligence" | Legal conclusion | "contributing factor(s)" |
| "slip-and-fall" (hyphenated) | Style | "slip and fall" |
| "in my opinion" | Entity voice | "In SCG's opinion" or restructure |
| "prior to" | Lane directive (28 Mar 2026) | "before" |
| "victim" | Presupposes liability | "Plaintiff" |
| "safe" / "unsafe" | Binary absolute | Describe factually |
| "causation" | Legal term of art | "contributing factor(s)" |
| "fault" | Legal conclusion | "contributing factor(s)" |
| "reasonable care" / "reasonable person" | Legal standard | Not expert's to assert |
| "unreasonably dangerous" | Legal conclusion | For counsel, not expert |

### Required Terms
| Term | Context |
|------|---------|
| "Plaintiff Expert" | Never "opposing expert" or "plaintiff's expert" |
| "subject incident area" | Physical location of the fall |
| "allegedly slipped and fell" | Always "allegedly" — never stated as fact |
| "Plaintiff's alleged accident" | Never "the accident" |
| "contributing factor(s)" | Causation language |
| "built environment" | The physical space at issue |
| "open and obvious" | Hazard visibility standard |
| "trier of fact" | Never "the jury" |
| "payment of attention" | Not "paying attention" |
| "Agency Having Jurisdiction" | Governing building authority |
| "in sound condition, properly calibrated" | Re: English XL VIT |
| "without ever evaluating the surface in question" | Remote-opinion expert dismissal |

---

## 6. ANALYTICAL ATTACK PATTERNS

These are SCG's repeatable rebuttal strategies. The Research Agent identifies which apply; the Drafting Agent executes them.

| ID | Pattern | Trigger | Sequence |
|----|---------|---------|----------|
| ATK-01 | Credential attack | Plaintiff expert has lapsed CXLT | Establish standard → check registry → report EXPIRED → state implication |
| ATK-02 | Code edition-in-force | Plaintiff cites wrong code | Permit date → jurisdiction → adopted code → apply section → distinguish |
| ATK-03 | Surveillance — no notice | Video shows no spill awareness | SDI credentials → 4-question framework → pedestrian counts → maintenance → conclude |
| ATK-04 | Footwear and gait | Plaintiff footwear contributed | Describe footwear → gait mechanics → NSC research → "payment of attention" → footnote |
| ATK-05 | Outside their lane | Plaintiff expert opines beyond expertise | Identify claim → state why outside expertise → explain required qualifications |
| ATK-06 | Open and obvious | Feature was visible | Describe feature → cite photo evidence → note no other issues → conclude |
| ATK-07 | Omission attack | Plaintiff expert skipped core steps | Establish what reliable expert does → itemize omissions → conclude significance |
| ATK-08 | Instrumentation defense | Plaintiff attacks tribometer choice | ANSI/ASTM basis → BOT-3000E auto operation → only device in A326.3 → plaintiff used none |
| ATK-09 | Exemplar/recreation | Physical recreation supports defense | Select exemplar → document characteristics → compare → demonstrate → document → conclude |
| ATK-10 | Physical description dismantling | Witness description defies physics | Take description → apply mechanics → identify impossibility → conclude inconsistent |

---

## 7. STANDARD OPINION BLOCKS

The Drafting Agent must recognize when a standard block applies and insert it rather than generating from scratch. These are verbatim or near-verbatim paragraphs that appear across filed reports.

| Block ID | Name | Trigger |
|----------|------|---------|
| BLK-01 | Slip case multi-factor opener | All slip/trip reports |
| BLK-02 | English XL VIT reliability | All slip resistance cases using XL VIT |
| BLK-03 | CXLT registry check | Attacking opposing expert credentials |
| BLK-04 | CBO credentials anchor | Code/building authority at issue |
| BLK-05 | SDI / surveillance expertise | Surveillance video analysis |
| BLK-06 | Surveillance 4-question framework | Video analysis purpose statement |
| BLK-07 | Distracted walking / NSC | Pedestrian attention at issue |
| BLK-08 | BOT-3000E device description | Defending instrument in rebuttal |
| BLK-09 | ANSI A326.3 defense | Plaintiff attacks the standard |
| BLK-10 | ASTM F13 committee membership | Establishing standing |
| BLK-11 | No site visit dismissal | Plaintiff expert didn't visit |
| BLK-CL | Conclusion boilerplate | All reports — closing paragraph |
| BLK-SC | Scope limitation | Rebuttal-only retention |
| BLK-PO | Points of Opinion opener | All reports — opens Points of Opinion |
| BLK-QA | Qualifications (Lane) | All reports — fixed credentials block |
| BLK-QM | Qualifications (Mariz) | All reports — partially templated |

**Full verbatim text for each block: see VOICE.md §§4, 7, 8, 9, 10.**

---

## 8. STANDARDS & CODES REFERENCE

### Slip Resistance Standards
| Standard | Use | Key Fact |
|----------|-----|----------|
| ANSI A326.3 | Primary slip resistance standard | Only standard with defined test method, calibration, equipment specs, thresholds for hard-surface flooring. BOT-3000E is only named device. |
| NFSI B101.1 | SCOF wet traction thresholds | ≥0.60 High; 0.40–0.59 Moderate; <0.40 Low |
| NFSI B101.3 | DCOF dry traction thresholds | ≥0.45 No action; 0.30–0.44 Monitor; <0.30 Intervention |
| ASTM F2508 | BOT-3000E validation | BOT-3000E validated to this standard |
| ASTM F2948-13 | Walkway Safety Auditor | Lane's UNT certification basis |

**Detailed threshold tables:** `reference/nfsi-thresholds.md` (cite exact §/page from standard)

### Building Codes
| Code | Notes |
|------|-------|
| International Building Code (IBC) | Current adopted code varies by jurisdiction and permit date |
| Uniform Building Code (UBC) | Pre-IBC adoption — still applicable for older construction dates |
| ADA / ICC A117.1 | Accessibility — see ADA Enforcement Architecture below |

### Code Adoption by Jurisdiction

**Adoption process (Southern Nevada):** The Southern Nevada Building Officials (SNBO) adopt versions of the codes together, then an ordinance is passed by each political subdivision of the state to tweak the codes for local needs. Individual jurisdictions may have slightly different effective dates even though SNBO coordinates the adoption.

**Adoption process (Utah):** The state adopts codes at the state level, not local.

**Local development codes:** In both southern and northern Nevada, local development codes layer ON TOP of the base building code.

**Data source:** SNBO directly, or Clark County Development Services official adoption records.

**Jurisdiction lookup table:** `reference/nevada-code-table.md`
- 6 jurisdictions: Clark County (unincorp.), Las Vegas, Henderson, North Las Vegas, Mesquite, Boulder City
- 13 code editions: UBC 1985 through IBC 2021
- Status: Effective dates pending SNBO records pull
- NRS 278.580 governs state-level building code authority

**Research Agent usage:** Look up property jurisdiction + permit date → find the row/column intersection in `nevada-code-table.md` → cite that edition. If cell is blank, jurisdiction had NOT adopted that edition — use the most recent adopted edition prior to permit date.

### ADA / A117.1 Enforcement Architecture

- **ADA (federal):** Enforced by the Department of Justice. Applies to places of public accommodation (Title III) and state/local government facilities (Title II).
- **A117.1 (standards body):** Originally published as CABO/ANSI A117.1; now ICC A117.1. Incorporated by reference into the IBC.
- **Historical note:** CABO (Council of American Building Officials) was the original publisher. ICC absorbed CABO. Older editions cite "CABO/ANSI A117.1"; current editions are "ICC A117.1."
- The IBC adopted its own version of the A117.1 standards, so the **IBC edition determines which A117.1 edition applies** to a given property.

**A117.1 → IBC edition mapping:** `reference/ada-edition-map.md`

| A117.1 Edition | Referenced By |
|---|---|
| A117.1-1998 | IBC 2000, IBC 2003 |
| A117.1-2003 | IBC 2006, IBC 2009 |
| A117.1-2009 | IBC 2012 |
| A117.1-2017 | IBC 2018, IBC 2021 |

**ADA trigger logic (Research Agent):** If property is a place of public accommodation (Title III) AND construction/alteration date ≥ 1992-01-26 (ADA effective), then: (1) determine applicable IBC edition from `nevada-code-table.md`, (2) map IBC → A117.1 edition, (3) check A117.1 §302 (floor surfaces) and §303 (changes in level), (4) check IBC Chapter 11 interaction, (5) if altered after construction → ADA Standards for Accessible Design (28 CFR Part 36) apply to altered elements with 20% path-of-travel cost cap.

### Code Citation Methodology (5-step sequence)
1. Identify permit/construction date
2. Identify jurisdiction
3. Confirm code edition adopted as of permit date (via `reference/nevada-code-table.md`)
4. Apply that edition's requirements to facts
5. Distinguish unadopted standards plaintiff cited

**Key phrase:** "The law matters. Textbooks and unadopted standards do not govern design and construction in Clark County."

### Reference Files Index (§8 Supporting Data)
| File | Contents | Status |
|------|----------|--------|
| `reference/nevada-code-table.md` | 6-jurisdiction × 13-edition adoption matrix | Effective dates pending SNBO pull |
| `reference/ada-edition-map.md` | A117.1 edition timeline + ADA trigger logic | § citations pending from Lane/CBO |
| `reference/nfsi-thresholds.md` | NFSI B101.1, B101.3, ANSI A326.3 thresholds | § and page numbers pending |
| `reference/credential-registry.md` | SCG credential verification | Dates + renewal pending |
| `reference/peterson-playbook.md` | Known adversary patterns | (see §10) |
| `reference/cxlt-fallback.md` | CXLT tribometer protocol | |

---

## 9. INSTRUMENTS & TESTING

| Instrument | Type | Key Defense |
|------------|------|-------------|
| English XL VIT | Manual tribometer | Peer-reviewed, ASTM F13 recognized, no motors/springs/electrical = no failure modes. CXLT certification required. |
| BOT-3000E | Digital automated tribometer | Electronic operation, no human input beyond placement = minimizes manipulation. Only device named in ANSI A326.3. Validated to ASTM F2508. |

**Calibration rule:** Both instruments calibrated before use. Testing conducted per published procedures.

**Defense against "outdated device" attack:** Both devices widely used across litigation and industry. ASTM F13 has long recognized both. Consistent, meaningful traction data when used per protocol.

---

## 10. KNOWN ADVERSARY: JOHN PETERSON

| Field | Detail |
|-------|--------|
| Organization | Retail Litigation Consultants |
| Status | Recurring plaintiff expert |
| Playbook source | Anderson (Dec 2025), Heagy (Jan 2026), prior cases |

### Peterson Attack Vectors (SCG counters)
| Peterson Move | SCG Counter |
|---------------|-------------|
| No site inspection | ATK-07 Omission attack + BLK-11 No site visit dismissal |
| No tribometer testing | "Cannot speak to tribometer performance at this location" |
| NFSI-only framing | Multi-body framework: ASTM, ANSI, ISO, university research, manufacturers |
| "Outdated devices" | Peer-reviewed use history, ASTM F13 recognition, ANSI A326.3 naming |
| Online university credential | Columbia Southern (online) vs. UNT (ASTM-based, hands-on) |
| GS-1 tribometer preference | Same ANSI A326.3 family as BOT-3000E — equally subject to his own criticisms |

---

## 11. BENCHMARK CASES

These three reports are the gold standard for QA calibration. Every AI draft must read like these.

| ID | Case | Type | Date | Significance |
|----|------|------|------|--------------|
| BM-GL | NP Santa Fe, LLC adv Gleason | Initial | 2 Feb 2026 | Most recent. Dual-expert structure. Exemplar/recreation. 1991 construction → 1988 UBC. Deepest footwear/gait analysis. |
| BM-HG | Clark County DoA dba Harry Reid Int'l Airport adv Heagy | Rebuttal | 23 Jan 2026 | Airport operations. Sharpest omission attack. Prose-style rebuttal. Scope limitation block. |
| BM-AN | Santa Fe Station Hotel and Casino adv Anderson | Supplemental | 2 Dec 2025 | Most thorough ANSI A326.3 / BOT-3000E defense. DCOF/SCOF analysis. Full Peterson playbook. |

**QA benchmark test:** "Could this paragraph appear, word for word, in a filed expert report in Clark County District Court without a single edit? Does it read like Gleason, Heagy, or Anderson?"

---

## 12. DOCUMENT FORMAT RULES

| Rule | Specification |
|------|---------------|
| Section headers | Underlined. Not bold. Not all-caps. (Exception: rebuttal SCG Response headers are bold.) |
| Text alignment | Full justification (left + right margins) |
| Figure captions | Bold. Centered below photo. "Figure N – [description]" |
| Figure dates | "SCG photo dated [date] of [subject]" |
| Doc list punctuation | Semicolons between items; period on final item |
| Footnote citations | Superscript number → footnote at page bottom (not in-text) |
| Sign-off | "Sincerely," → "SWAINSTON CONSULTING GROUP" → dual signatures → credential logos |
| Plaintiff quotes | Italics in body text when being refuted |

---

## 13. PIPELINE ↔ BRAIN MAPPING

How the 4 BlackBar agents query this brain during their Orient steps:

### Intake Agent
| Query | Brain Section |
|-------|---------------|
| What case types does SCG handle? | §3 Case Taxonomy |
| What document types appear in cases? | §4 Report Types, §6 Documentation Reviewed format (VOICE.md §6) |
| What jurisdiction rules apply? | §8 Standards & Codes, §12 Code Citation Methodology |
| Who are the personnel? | §2 Personnel & Credentials |

### Research Agent
| Query | Brain Section |
|-------|---------------|
| What attack patterns apply to this case? | §6 Analytical Attack Patterns |
| What standards govern this surface/structure? | §8 Standards & Codes Reference |
| Is the opposing expert a known adversary? | §10 Known Adversary |
| What code edition was in force? | §8 Code Citation Methodology (5-step sequence) |
| What DCOF/SCOF thresholds apply? | §8 NFSI B101.1 / B101.3 |

### Drafting Agent
| Query | Brain Section |
|-------|---------------|
| What voice rules must I follow? | §5 Voice Rules |
| Which standard blocks should I insert? | §7 Standard Opinion Blocks |
| What terms are prohibited? | §5 Prohibited Terms |
| What report structure applies to this type? | §4 Report Types & Structure |
| What format rules apply? | §12 Document Format Rules |
| What conclusion boilerplate do I use? | §7 BLK-CL |

### QA Agent
| Query | Brain Section |
|-------|---------------|
| Does this draft match benchmark quality? | §11 Benchmark Cases + QA benchmark test |
| Are prohibited terms present? | §5 Prohibited Terms (scan draft) |
| Is the entity voice consistent? | §5 Identity rules (no "I" in body) |
| Are dates in European format? | §5 Date Format |
| Are citations in correct format? | §12 Document Format Rules |
| Is the case naming correct? | §5 Case Naming (VOICE.md §3) |

---

## 14. KNOWN GAPS (REQUIRES LANE INPUT)

These topics are not yet documented in VOICE.md or benchmark reports:

- [x] ADA / ICC A117.1 analytical sequence — merged into §8 (enforcement architecture + trigger logic + edition mapping). Detailed lookup: `reference/ada-edition-map.md`. §/page citations still pending from Lane/CBO.
- [ ] Stair/riser/handrail code analysis — standard opening for stair cases
- [ ] Fire code analysis structure (Category 10 cases)
- [ ] "Model language" Lane considers settled vs. still evolving
- [ ] How Lane qualifies or limits opinions in edge cases
- [ ] Terminology evolution (earlier reports vs. recent)
- [ ] TCDS credential full form and application context (assumed: Traffic Crash Data Specialist)
- [ ] Fuller prohibited/required terminology list (noted 28 Mar 2026 — Lane + Mariz to provide)

**Resolution path:** As Lane provides input or new reports are filed, update the relevant sections and re-run the Golden Set.

---

## 15. GOLDEN SET HOOKS

These questions validate that ENTERPRISE_BRAIN.md hasn't drifted from SCG operational truth. Scoring: LLM-as-judge, 0–100, flag <70.

| ID | Domain | Question | Must Contain | Must NOT Contain |
|----|--------|----------|--------------|------------------|
| BB-001 | Voice | Who speaks in the body of an SCG report? | SCG, entity | I, Lane, first person |
| BB-002 | Format | What date format does SCG use? | European, day month year | April 15, commas, ordinals |
| BB-003 | Attack | What pattern does SCG use when a plaintiff expert skips a site visit? | ATK-07, omission, BLK-11 | accept, defer |
| BB-004 | Standards | What is the only device named in ANSI A326.3? | BOT-3000E | English XL VIT, GS-1 |
| BB-005 | Adversary | How does SCG counter Peterson's "NFSI-only" framing? | multi-body, ASTM, ANSI, ISO | accept NFSI authority, concede |
| BB-006 | Structure | What is the standard section sequence for an Initial Report? | Qualifications, Documentation, Date/Location, Details, Points of Opinion, Conclusion | random order, no sequence |
| BB-007 | Terms | Can an SCG report use the word "negligence"? | no, legal conclusion, contributing factor | yes, permitted |
| BB-008 | Benchmark | Name the three benchmark cases. | Gleason, Heagy, Anderson | generic, unnamed |
| BB-009 | Code | What is the 5-step code citation methodology? | permit date, jurisdiction, adopted code, apply, distinguish | skip, assume |
| BB-010 | QA | What is the QA benchmark test question? | Clark County District Court, without a single edit | good enough, close |

**Drift detection:** Run on every ENTERPRISE_BRAIN.md edit or new VOICE.md version. If any question drops below 70, the document has drifted.

---

*ENTERPRISE_BRAIN.md is a living document. Each new case should be reviewed after drafting to identify new patterns, blocks, terminology, or adversary intelligence worth adding here.*
*Version 1.0 — Built 2026-03-29 from VOICE.md v2.0 and Product Owner context.*
