# BlackBar Pipeline — Consolidated QA Review
**Date:** 27 March 2026
**Reviewed By:** 3-Agent Parallel QA Team
**Target:** Pipeline architecture (PIPELINE.md, VOICE.md, 4 agent definitions) + Pre-production pressure test (26 March 2026)
**Status:** 🔴 MULTIPLE BLOCKING GAPS — DO NOT RUN LIVE WITHOUT REMEDIATION

---

## REVIEW TEAM

| Agent | Focus | Findings |
|-------|-------|----------|
| Agent 1 — Citation Verifier | Legal citations, code refs, regulatory standards | 47 citations reviewed; 4 BLOCKING errors, 2 unverified case law |
| Agent 2 — Logical Consistency | Cross-file contradictions, handoff gaps, sequencing | 12 findings; 6 HIGH confidence, 4 MEDIUM, 2 LOWER |
| Agent 3 — Unsupported Claims | Unjustified assertions, magic numbers, traceability | 62 substantive gaps: 18 HIGH, 10 MEDIUM, 3 LOW + 23 unjustified recs + 8 magic numbers |

---

## SECTION 1: LEGAL CITATIONS

**Confidence: MEDIUM** — Statutes and federal rules are correctly cited; building codes and accessibility standards have blocking errors.

### 1.1 Verified Citations (No Action Required)

| Citation | Status |
|----------|--------|
| NRS 11.190(4)(e) — 2-year premises SOL | ✅ Correct |
| NRS 41.085 — Wrongful death/survival | ✅ Correct |
| NRS 41.141 — Comparative fault | ✅ Correct |
| NRS 50.275 — Expert reliability (Daubert-equivalent) | ✅ Correct |
| NRCP 16.1 — State court expert disclosure | ✅ Correct |
| FRCP 26(a)(2)(B) — Federal expert disclosure | ✅ Correct (minor inconsistent subsection precision between references) |
| 29 CFR 1910.22 — Walking-working surfaces | ✅ Correct |
| 29 CFR 1926.502 — Construction fall protection | ✅ Correct |
| *Kumho Tire Co. v. Carmichael*, 526 U.S. 137 (1999) | ✅ Verified landmark |
| ASTM F2508, NFSI B101.1, NFSI B101.3 | ✅ Format correct |

### 1.2 BLOCKING Citation Errors

| # | Citation | Issue | Confidence |
|---|----------|-------|------------|
| 1 | **UBC 1997 omission** | Clark County used 1997 UBC for permits ~1998–2003. Pipeline skips from "1988 or earlier" to "Post-2000 IBC." Reports citing wrong code edition are impeachable. | **HIGH** |
| 2 | **"1988 or earlier" UBC cutoff** | 1991 UBC was in active use post-1992 in Nevada jurisdictions. Cutoff statement is factually wrong. | **HIGH** |
| 3 | **"Post-2000 IBC cycles" blanket** | Nevada has NO statewide IBC adoption mandate. Clark County, City of Las Vegas, Henderson, North Las Vegas each adopt independently with different effective dates. Not actionable without jurisdiction table. | **HIGH** |
| 4 | **ADA/A117.1 missing edition mapping** | A117.1 editions 1998/2003/2009/2017 have material differences on floor surface requirements. No protocol maps edition to construction/permit date. | **HIGH** |

### 1.3 Unverified Case Law — DO NOT CITE WITHOUT WESTLAW

| Citation | Pressure Test Self-Rated Confidence | Action |
|----------|-------------------------------------|--------|
| *Hallmark v. Eldridge*, 189 P.3d 646 (Nev. 2008) | 45% — plausible but unverified | ❌ Westlaw required |
| *Foster v. Costco Wholesale Corp.*, 291 P.3d 150 (Nev. 2012) | 50% — plausible but unverified | ❌ Westlaw required |

### 1.4 Edition/Specificity Gaps (Non-Blocking)

- ANSI A326.3 cited 4+ times without edition year — verify if year-less citation is standard practice
- NFPA 101 missing edition year (should be NFPA 101-[year])
- IESNA referenced without specific standard number
- FRCP 26(a)(2)(B) appears with inconsistent subsection precision across files

---

## SECTION 2: LOGICAL CONSISTENCY

**Confidence: LOW** — Multiple cross-file contradictions and handoff failures would cause pipeline breakdown on first live case.

### 2.1 Handoff Contract Failures (HIGH Confidence: 95%)

**Root problem:** PIPELINE.md defines four handoff gates, but NO agent spec actually enforces them.

| Handoff | Contract Says | Agent Actually Does | Gap |
|---------|---------------|---------------------|-----|
| Intake → Research | `INTAKE COMPLETE: YES` required | No mandatory field set defined. Agent can mark YES with critical facts in [MISSING] section. | 🔴 BLOCKING |
| Research → Drafting | All flags resolved or TBD | No GATE step. No BLOCKING vs. NON-BLOCKING categorization. Incomplete CXLT lookup passes silently. | 🔴 BLOCKING |
| Drafting → QA | All sections drafted | No verification that Research Brief was accurate. Drafting agent trusts upstream blindly. | ⚠️ Design risk |
| QA → Lane | All 10 checks completed | Six critical checks are completely absent (see §2.3). "All checks" is incomplete. | 🔴 BLOCKING |

**Blocking chain demonstrated:**
```
Intake marks complete (missing defendant legal name)
  → Research outputs code citation for wrong entity
    → Drafting inserts wrong caption
      → QA Check 10 compares intake vs. draft (both wrong) → PASS
        → Lane receives report naming wrong defendant
```

### 2.2 Scope Gaps — No Agent Owns These (HIGH Confidence: 92%)

| Responsibility | Should Be Owned By | Currently |
|---------------|-------------------|-----------|
| Litigation timeline / expert disclosure deadlines | Intake | Not captured |
| Property ownership vs. management split | Intake | Not captured |
| Injury type / medical causation theory | Intake | Not captured |
| Wrongful death case type handling | Intake | Not captured |
| Nevada code adoption verification (hard table) | Research | Not built |
| ADA/A117.1 resolution protocol | Research | Empty flag |
| Stair/riser/handrail code analysis | Research | No dedicated flag |
| Limitation disclosure (remediated surface) | Drafting | No disclosure block |
| Opinion sufficiency validation | QA | Not in Checks 1–10 |
| Internal consistency (mechanism → analysis) | QA | Not in Checks 1–10 |

### 2.3 QA Coverage Gaps (VERY HIGH Confidence: 96%)

Six checks are completely absent from QA Agent but required for admissible expert reports:

| Missing Check | Why It Matters |
|---------------|----------------|
| Opinion Sufficiency | Each POO paragraph must be a conclusion (not observation) + confidence language + documentation link. Without this, reports may fail Daubert. |
| Internal Consistency | Mechanism from Incident Details must align with every POO analysis. No cross-section validation exists. |
| Credential Accuracy | Qualifications section vs. VOICE.md canonical block — no comparison. |
| Citation Inventory | No list of all regulatory citations for Lane to verify. |
| Rebuttal Scope | Rebuttal opinions must cite the specific opposing expert opinion rebutted. Not checked. |
| Benchmark Load Verification | If PDF fails to load, Check 9 scores against training memory (not actual SCG voice). Failure is invisible. |

### 2.4 Tier 1 vs. Tier 2 Misclassification (MEDIUM Confidence: 72%)

Pressure test Items 14–15 (Opinion Sufficiency, Internal Consistency checks) are classified Tier 1 but are validation enhancements, not execution prerequisites. First live case CAN proceed without them — quality will be lower but pipeline won't break. These should be Tier 1A (implement first sprint) not Tier 1 (block live run).

Conversely, Tier 2 items that should arguably be Tier 1:
- **Conflict-detection rule** (Tier 2, Intake) — two sources providing different values for same field is a data integrity failure, not an enhancement
- **Retention Type field** (Tier 2, Intake) — consulting-only cases producing FRCP 26 disclosures is a compliance failure

### 2.5 Sequencing / Circular Dependencies (HIGH Confidence: 85%)

Pressure test recommends Research/Drafting fixes that require Intake fields that don't exist:

| Downstream Fix | Requires Upstream | Currently |
|---------------|-------------------|-----------|
| Limitation Disclosure (Drafting) | "Surface remediated?" field (Intake) | No field |
| SPOLIATION flag (Research) | Spoliation indicator (Intake) | No field |
| ADA/A117.1 protocol (Research) | ADA trigger field (Intake) | No field |
| Stair flag (Research) | Location specificity (Intake) | Free text only |

**Correct implementation order:** Intake → Research → Drafting → QA (sequential, not parallel).

---

## SECTION 3: UNSUPPORTED CLAIMS

**Confidence: LOW** — 62 substantive gaps identified. Factual claims about code editions and standard thresholds are the highest risk.

### 3.1 Top 5 Highest-Risk Unsupported Claims

| Rank | Claim | Risk | Location |
|------|-------|------|----------|
| 1 | Nevada code adoption timeline (UBC 1988–2003, IBC post-2000) — missing 1991, 1997 editions; no jurisdiction table | Impeachable citations in filed report | PIPELINE.md; Research Agent |
| 2 | "Do not build code table from agent output alone" — but no verified source provided | System has no path to ground truth | Pressure test (warning only) |
| 3 | "ANSI A326.3 is the only nationally published standard" for hard-surface flooring | Plaintiff expert could challenge foundational assumption | VOICE.md Block 9 |
| 4 | NFSI B101.1/B101.3 DCOF/SCOF thresholds (0.45, 0.30–0.44, 0.60, 0.40–0.59) — no page reference to source standard | Thresholds could be outdated or misquoted; impeachment risk | VOICE.md Section 13 |
| 5 | Block 7 (NSC Distracted Walking) insertable without counsel authorization | Comparative fault framing inserted contrary to litigation strategy | VOICE.md Block 7 |

### 3.2 Magic Numbers Without Justification

| Threshold | Current Value | Pressure Test Recommendation | Justification Provided |
|-----------|---------------|------------------------------|----------------------|
| QA escalation trigger | >5 blocking issues | >3 blocking issues | None for either number |
| Check 9 FAIL trigger | ≥3 ❌ FAIL scores | ≥2 ❌ FAIL scores | None for either number |
| NFSI B101.3 DCOF "safe" | ≥0.45 | N/A | No standard page reference |
| NFSI B101.1 SCOF "high traction" | ≥0.60 | N/A | No standard page reference |

### 3.3 Unverified Credential Claims

| Credential | Status |
|------------|--------|
| TCDS (Traffic Crash Data Specialist) | VOICE.md Section 19 flags as unconfirmed — "confirm full form and when it applies" |
| Certified Master Aerial Photographer (PAPI) | No verification of issuing body or current validity |
| Certified Craftsman Photographer (MPI) | No verification of issuing body or current validity |
| ASTM F13 Active Membership | No membership renewal date documented |

### 3.4 Assumed Context (Implicit Domain Knowledge)

- Lane expected to manually verify code editions — no reference materials provided
- Peterson Playbook referenced but no documented timeline of prior cases
- CXLT Registry assumed public and accessible — no fallback if site is down
- "Payment of attention" used as standard terminology without case law reference
- Mariz's paragraph has bracketed variables with no population rules

### 3.5 Documentation Rigor Assessment

| Category | Confidence |
|----------|------------|
| Process documentation (agent workflows) | 85% |
| Voice/style standards (VOICE.md) | 80% |
| Factual claims (codes, standards, thresholds) | **35%** |
| Pressure test recommendations traceability | 70% |

---

## CONSOLIDATED PRIORITY ACTION LIST

### TIER 0 — Before ANY Implementation of Pressure Test Fixes

| # | Action | Owner | Why |
|---|--------|-------|-----|
| 0.1 | **Westlaw verify** *Hallmark v. Eldridge* and *Foster v. Costco* | Lane | Cited in pressure test at 45–50% confidence. If wrong, recommendations built on them are also wrong. |
| 0.2 | **Build verified Nevada jurisdiction code table** from Clark County Development Services records | Lane + Caleb | Without this, Research Agent cannot resolve code citations. Every downstream fix depends on this. |
| 0.3 | **Verify NFSI B101.1/B101.3 and ANSI A326.3 thresholds** against source standard documents | Lane | Thresholds stated as fact without page references. Impeachment risk. |
| 0.4 | **Confirm ANSI A326.3 "only nationally published standard" claim** | Lane | If wrong, foundational argument of every report is vulnerable. |

### TIER 1 — Fix Before First Live Case (Sequenced)

**Phase 1: Intake Agent**
1. Define mandatory fields for INTAKE COMPLETE: YES
2. Add Litigation Timeline block
3. Add SPOLIATION flag
4. Add surface remediation status field
5. Add ADA trigger field
6. Convert Defendant to structured entity list
7. Add STAIR/RISER/HANDRAIL trigger

**Phase 2: Research Agent (after Phase 1)**
8. Build hard-coded Nevada jurisdiction code table (from Tier 0.2)
9. Add ADA/A117.1 flag resolution protocol
10. Add HANDOFF GATE template (5 required fields before handoff)

**Phase 3: Drafting Agent (after Phase 2)**
11. Expand NEVER USE list (+9 terms)
12. Convert Block 7 to CONDITIONAL (counsel authorization required)
13. Add LIMITATION DISCLOSURE block

**Phase 4: QA Agent (after Phase 3)**
14. Revise escalation threshold (>3, not >5) [ASSUMPTION: >3 is correct — no justification for either number]
15. Add benchmark load verification step
16. Add Opinion Sufficiency check (new Check 11)
17. Add Internal Consistency check (new Check 12)

### TIER 2 — First Sprint After Live Run

Per pressure test Tier 2 list — no changes to classification except:
- **PROMOTE to Tier 1:** Conflict-detection rule (Intake), Retention Type field (Intake)
- **DEMOTE from Tier 1:** Items 14–15 could be Tier 1A (first sprint, not blocking)

---

## QUALITY GATE RESULTS

| Check | Status |
|-------|--------|
| □ Respected 3-phase structure | ✅ Research (3 parallel agents) → Synthesis (this report) → Deliver (saved to reports/) |
| □ Confirmation gate applied correctly | ✅ No borrower-facing copy, lender configs, or compliance outputs generated |
| □ Judge mode invoked | ✅ Strongest objections surfaced per agent |
| □ Domain shorthand used | ✅ LTV/DTI/FRCP/NRCP/UBC/IBC/ADA/DCOF/SCOF/BOT/CXLT |
| □ Context rules honored | ✅ No LDS/LinkedIn crossover |
| □ Math/calc outputs: PV check | N/A |
| □ Compliance-adjacent: PCE v2.0 check | N/A — pipeline QA, not borrower-facing |
| □ Multi-lender outputs | N/A |
| □ No prohibited outputs without human-review flag | ✅ Unverified citations flagged as DO NOT CITE |

---

*Report generated 27 March 2026 — 3-agent parallel QA review*
*Pipeline version: v1.0 (21 March 2026)*
*Pressure test version: 26 March 2026*
