# Lane's GTM Responses — 28 Mar 2026
## Source: BlackBar GTM Sprint Strategy Form (FormSubmit.co)

---

### 1. Mandatory Intake Fields
**Question:** What fields must the Intake Agent capture from every new case submission?
**Lane's Answer:**
> Name of client contact, usually the law firm. Short statement regarding nature of the matter. Name of opposing counsel and client.

**Mapping:** `agents/intake/BlackBar-Intake.md` — confirm these 3 fields are in the MATTER IDENTIFICATION section of the Intake Brief schema.
**Status:** ✅ ACTIONABLE — attorney name/firm and case caption already exist in schema. Add explicit "Nature of matter (short statement)" field and "Opposing counsel + client" field if not present.

---

### 2. Litigation Deadline Source
**Question:** Where do litigation deadlines come from?
**Lane's Answer:**
> Typically the court. We also work on deadlines imposed by the client for various reasons. We can pull from Clio or take it from this software into Clio.

**Mapping:** `agents/intake/BlackBar-Intake.md` — LITIGATION TIMELINE block (Tier 1 fix #2 from pressure test).
**Status:** ✅ ACTIONABLE — Intake Agent should capture: (1) Court-imposed deadlines (expert disclosure, trial date), (2) Client-imposed deadlines with reason. Future: Clio integration for bidirectional deadline sync.
**Integration note:** Clio is SCG's practice management system. BlackBar should eventually read/write deadlines there.

---

### 3. NV Jurisdiction Code Table
**Question:** How does Nevada code adoption work?
**Lane's Answer:**
> Fortunately there is an organization called the Southern Nevada Building Officials (SNBO). They adopt versions of the codes together and then an ordinance is passed by each political subdivision of the state to tweak the codes for local needs. In Utah the state adopts the codes. However, there are also local development codes just as there are in southern and northern Nevada.

**Mapping:** `reference/nevada-code-table.md` — adds critical context for the SNBO unified adoption process.
**Status:** ⚠️ PARTIAL — Lane confirmed the mechanism (SNBO adopts collectively, each jurisdiction tweaks via ordinance) but did NOT provide the actual effective dates. The table remains unpopulated. SNBO is the source to query for official adoption dates.
**Action for Claude Code:** Add SNBO context to the table header. The actual dates still need to come from official SNBO/Clark County Dev Services records.
**Utah note:** For any future Utah expansion, code adoption is at the state level (not local jurisdiction). Different architecture than NV.

---

### 4. Never Use Word List
**Question:** What terms should never appear in SCG reports?
**Lane's Answer:**
> "Prior to" should be "before", we typically use "alleged accident", and we avoid absolute terms. Will need to get you a clearer answer by working with Mariz.

**Mapping:** `VOICE.md` Section 11 — expand the NEVER USE table.
**Status:** ⚠️ PARTIAL — Two immediate additions:
1. "prior to" → replace with "before" (stylistic, not legal)
2. Absolute terms (avoid) — "clearly", "obviously", "undoubtedly", "certainly", "unquestionably"
**Pending:** Fuller list coming from Lane + Mariz collaboration. Flag for follow-up.
**Confirms:** "alleged accident" is correct usage (already in ALWAYS USE table).

---

### 5. Contributory Negligence Gate
**Question:** Should BlackBar include contributory negligence analysis (Block 7)?
**Lane's Answer:**
> Yes. Although it is almost a universal consideration.

**Mapping:** `templates/contributory-negligence-gate.md`
**Status:** ✅ ACTIONABLE — Lane confirms Block 7 is almost always relevant. However, the CONDITIONAL gate must remain — "almost universal" ≠ "always." The Intake Agent should still capture counsel's strategy decision, but the DEFAULT should be YES (opt-out rather than opt-in).
**Rule change:** Flip the gate default from "excluded unless authorized" to "included unless counsel explicitly opts out."

---

### 6. Limitation Disclosure Language
**Question:** What language governs limitation disclosures?
**Lane's Answer:**
> If a "subsequent remedial measure" has been implemented, we typically avoid including a reference in our report.

**Mapping:** `templates/limitation-disclosure.md`
**Status:** ⚠️ IMPORTANT CONFLICT — The current limitation-disclosure.md template says to INSERT a caveat when the surface was remediated. Lane says the opposite: AVOID referencing subsequent remedial measures. This aligns with FRE 407 / NRS 48.135 (subsequent remedial measures are generally inadmissible).
**Action for Claude Code:** Revise the trigger logic. The limitation disclosure block should NOT reference the remediation itself. Instead, it should note that SCG's measurements reflect the surface as inspected on the inspection date, WITHOUT mentioning the repair/replacement. Remove the "[repaired/replaced]" language from the template.

---

### 7. ADA / A117.1 Protocol
**Question:** How should BlackBar handle ADA and A117.1 standards?
**Lane's Answer:**
> The federal government enforces the ADA through the Department of Justice. The ANSI A117.1 standards were incorporated into the IBC years ago, with their own version of the CABO/ANSI A117.1.

**Mapping:** `reference/ada-edition-map.md`
**Status:** ✅ ACTIONABLE — Lane confirms the dual-track architecture:
1. **ADA (federal):** Enforced by DOJ. Applies to places of public accommodation (Title III). ADA Standards for Accessible Design.
2. **A117.1 (standards body):** Incorporated by reference into IBC. Originally CABO/ANSI A117.1, now ICC A117.1.
**Action for Claude Code:** Add enforcement/authority context to the ada-edition-map.md header. The edition mapping table still needs § citations from Lane or CBO.
**Historical note:** CABO (Council of American Building Officials) was the original publisher. ICC absorbed CABO; the standard is now just "ICC A117.1" but older editions cite "CABO/ANSI A117.1."

---

### 8. First Live Case Selection
**Question:** Which case should be the first live BlackBar test?
**Lane's Answer:**
> Will pick one on Monday with Mariz.

**Mapping:** `cases/` directory — first case will create the initial `cases/[Case-ID]/` folder structure.
**Status:** ⏳ PENDING — Monday selection with Mariz. No action until case is identified.
**Prep for Claude Code:** Ensure `cases/` directory exists and the Intake Agent is ready to accept raw input in any format.

---

## SUMMARY — READINESS FOR CLAUDE CODE

| # | Topic | Actionable Now? | Blocks First Case? |
|---|-------|:-:|:-:|
| 1 | Mandatory Intake Fields | ✅ Yes | No (fields exist) |
| 2 | Litigation Deadline Source | ✅ Yes | Yes (Tier 1 #2) |
| 3 | NV Jurisdiction Code Table | ⚠️ Partial | Yes (dates still needed) |
| 4 | Never Use Word List | ⚠️ Partial | No (expand later with Mariz) |
| 5 | Contributory Negligence Gate | ✅ Yes | No (flip default) |
| 6 | Limitation Disclosure | ✅ Yes | Yes (template needs revision) |
| 7 | ADA/A117.1 Protocol | ✅ Yes | No (context only) |
| 8 | First Live Case | ⏳ Monday | Yes (waiting on selection) |
