# SCG Case Assignment Workflow → BlackBar Pressure Test Mapping
**Source:** `SCG-Case-Assignment-Workflow-Official.docx` (Lane Swainston, SCG)
**Mapped by:** Caleb Swainston, 28 March 2026
**Purpose:** Trace Lane's official workflow into specific BlackBar agent improvements

---

## How to Read This

Each SCG workflow section is mapped to the pressure test items it informs. Items marked **INFORMS** provide operational context or validation. Items marked **ACTIONABLE** give us specific implementation details to encode into agent prompts.

---

## §1 — Defining Objectives and Scope

> "Identify the Purpose… Set Measurable Goals… Establish Boundaries… Identify Stakeholders"

| Maps To | Type | Implementation Note |
|---------|------|-------------------|
| **T1-01** (Intake mandatory fields) | ACTIONABLE | "Establish Boundaries" = the Intake Agent must capture **report type** and **retention scope** as mandatory. Lane's workflow requires explicit scope definition before any work begins. |
| **T1-05** (Structured defendant list) | ACTIONABLE | "Identify Stakeholders: List all individuals and players" = the Intake Agent must capture all parties, not just a single defendant name. Supports structured entity list with roles. |
| **Tier 2: Retention Type** | ACTIONABLE | "Identify the Purpose" — SCG distinguishes testifying expert from consulting engagement at scope definition. Intake Agent must capture `RETENTION TYPE: TESTIFYING / CONSULTING` before pipeline proceeds. |

---

## §2 — Mapping the Process

> "Establish the scope of allegations… examine available documentation, such as statements, contracts, procedures, incident reports, recorded imagery, and deposition testimony… Conduct a site visit… perform any necessary testing"

| Maps To | Type | Implementation Note |
|---------|------|-------------------|
| **T1-01** (Intake mandatory fields) | ACTIONABLE | SCG's canonical document types are: **statements, contracts, procedures, incident reports, recorded imagery, deposition testimony**. Intake Agent should use this as a checklist with `RECEIVED / EXPECTED / NOT APPLICABLE` per type. A minimum of 1 document confirmed received is required for INTAKE COMPLETE. |
| **T1-08** (Research handoff gate) | ACTIONABLE | "Conduct a site visit to observe on-site conditions and perform any necessary testing" — site visit is a mandatory SCG step. Research Agent handoff gate should include `SITE VISIT STATUS: COMPLETED / SCHEDULED / NOT SCHEDULED`. If NOT SCHEDULED, flag as BLOCKING for initial reports (non-blocking for rebuttals where inspection already occurred). |
| **Tier 2: PHOTOGRAMMETRY flag** | INFORMS | "Utilize evidentiary processing tools or technology (digital or analog)" — confirms SCG uses instrumentation beyond tribometry. Supports adding flags for 3D scan, Matterport, LiDAR. |

---

## §3 — Resource Allocation

> "Identify Required Resources… Obtain a non-refundable retainer… Establish Communication Channels"

| Maps To | Type | Implementation Note |
|---------|------|-------------------|
| **New Intake field** | ACTIONABLE | `RETAINER STATUS: CONFIRMED / PENDING / WAIVED` — Lane's workflow gates resource allocation on retainer. Intake Agent should capture this. Not a Tier 1 blocker; add as Sprint 3 item. |
| **Tier 2: MULTI-EXPERT COORDINATION** | INFORMS | "Identify… all… personnel necessary for the assignment" — confirms SCG explicitly maps all experts involved. Supports the multi-expert coordination flag. |
| **Tier 2: Communication channels** | INFORMS | "Establish Communication Channels… Set up platforms or methods" — SCG uses **Clio** (§4) as the primary case management platform. Agent outputs should reference Clio as the system of record for deadlines and document tracking. |

---

## §4 — Set Timelines and Milestones

> "Establish Deadlines… Define Milestones… Use Clio software or calendars to track timelines"

| Maps To | Type | Implementation Note |
|---------|------|-------------------|
| **T1-02** (Litigation Timeline block) | ACTIONABLE | **Clio is the source of truth for deadlines.** The Intake Agent's Litigation Timeline block should reference Clio fields: complaint filed date, plaintiff expert disclosure deadline, defense expert disclosure deadline, trial date, court designation. The agent prompt should instruct: "If timeline fields are not provided in raw input, flag as `[MISSING — CHECK CLIO]`." |
| **Sprint 4: Operator independence** | INFORMS | Clio integration means Lane/Mariz already have a system for tracking — BlackBar doesn't need to replace it, just reference it. |

---

## §5 — Execution of Workflow + Quality Control

> "Monitor Progress… Hold regular check-ins… Especially at each stage of AI use, survey the work product to determine accuracy and completeness… Document and address any deviations from the process"

| Maps To | Type | Implementation Note |
|---------|------|-------------------|
| **T1-08** (Research handoff gate) | INFORMS | Lane's own workflow explicitly requires quality review "at each stage of AI use." This is the operational mandate for handoff gates between agents. We are not over-engineering — Lane already expects this. |
| **Sprint 2 design** | INFORMS | "Survey the work product to determine accuracy and completeness" — Sprint 2 (first live case) correctly requires Lane reviewing every stage output. This is Lane's stated expectation, not a training-wheel restriction. |
| **T1-12** (QA escalation threshold) | INFORMS | "Document and address any deviations from the process and communicate promptly" — validates that QA escalation should be aggressive (>3 blocking, not >5). Lane wants to know immediately. |

---

## §6 — Review and Optimization

> "Gather Feedback… Analyze Outcomes… Compare the results against the initial objectives… Identify Improvement Areas… Revise the workflow"

| Maps To | Type | Implementation Note |
|---------|------|-------------------|
| **VOICE.md maintenance protocol** | INFORMS | Lane's workflow already includes a post-engagement feedback loop. This maps directly to the VOICE.md update protocol: every filed report triggers a review for new boilerplate, patterns, or structural elements. |
| **Sprint 5: Production metrics** | INFORMS | "Compare the results against the initial objectives" — supports the KPI framework (edit distance, cycle time, QA prediction accuracy). |

---

## §7 — Automation and Technology Integration

> "Identify Automatable Tasks: Look for repetitive, rules-based tasks suitable for automation… Implement and Test: Introduce automation gradually, testing each component for reliability… Train Staff"

| Maps To | Type | Implementation Note |
|---------|------|-------------------|
| **Sprint 4: Mariz onboarding** | INFORMS | "Train Staff: Provide training to ensure everyone can use any new systems effectively" — confirms Sprint 4's Mariz training plan aligns with Lane's workflow expectations. |
| **Overall BlackBar validation** | INFORMS | "Repetitive, rules-based tasks suitable for automation" — this is Lane's own language authorizing exactly what BlackBar does. The pipeline automates the repetitive drafting/research work so Lane can focus on "primary value in pertinent analysis" (§Intro). |

---

## §8 — Risk Management

> "Identify Risks… possible obstacles, such as resource shortages, technical issues, or the unavailability of data… newly discovered evidence that may not have been anticipated"

| Maps To | Type | Implementation Note |
|---------|------|-------------------|
| **T1-03** (SPOLIATION flag) | INFORMS | "Unavailability of data" and "newly discovered evidence" — Lane's own risk framework recognizes data destruction/unavailability as a category. Supports adding SPOLIATION as a BLOCKING flag. Use Lane's language: "unavailability of data" can be cited when explaining the flag to Lane. |
| **Risk register (GTM strategy)** | INFORMS | "Develop Contingency Plans: Prepare backup plans for critical areas" — validates the risk register in the GTM sprint strategy HTML. |

---

## §9 — Communication and Collaboration

> "Avoid exposing the process to any undesirable discovery by the opposing side"

| Maps To | Type | Implementation Note |
|---------|------|-------------------|
| **GitHub repo visibility** | ACTIONABLE | Confirms the private repo decision. BlackBar system prompts, VOICE.md, and pipeline architecture contain work product methodology that could be discovered. Repo must remain private. Agent prompts should never be shared outside SCG. |
| **Tier 2: Consulting vs. testifying** | INFORMS | If retention type is consulting (non-testifying), the entire pipeline output is privileged work product. If testifying, it's disclosable under FRCP 26(a)(2)(B). Retention type must be captured at intake. |

---

## §10 — Closing and Evaluation

> "Document Lessons Learned… Archive Records: Store workflow documents securely for future reference and compliance"

| Maps To | Type | Implementation Note |
|---------|------|-------------------|
| **Case folder archival** | INFORMS | Confirms that completed case folders (intake.md, research.md, draft.md, qa-report.md, final/) should be archived. Cases/ folder stays local and excluded from GitHub. |

---

## Summary: Net Impact on Sprint Plan

| Sprint | Items Informed | Items with Actionable Detail |
|--------|---------------|----------------------------|
| Sprint 1 | T1-01, T1-02, T1-03, T1-05, T1-08, T1-12 | T1-01 (document checklist), T1-02 (Clio reference), T1-05 (stakeholder list), T1-08 (+site visit gate field) |
| Sprint 2 | Stage-level review validation | Sprint 2 design confirmed correct |
| Sprint 3 | Retainer status field, multi-expert flag, PHOTOGRAMMETRY flag | Retainer field, retention type field |
| Sprint 4 | Mariz training, Clio integration | Training plan validated |
| Sprint 5 | VOICE.md maintenance, metrics, archival | Feedback loop confirmed |

**Bottom line:** 4 of the 15 Tier 1 items get better implementation specs from this document. No blockers are fully resolved by it alone — the fixes still require agent prompt engineering — but the document gives us Lane's own operational language to justify and specify the fixes.
