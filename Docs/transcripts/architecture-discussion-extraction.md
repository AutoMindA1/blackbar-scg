# Transcript Extraction Report
**Source:** `Black-Bar - Architecture Discussion.txt` — 1hr 10min call, Caleb Swainston + Lane Swainston  
**Extracted by:** Swainston AI Committee v2.0  
**Date:** 2026-04-19

---

## Summary

Lane walks Caleb through the complete SCG case lifecycle — from first contact through trial — while reacting to a live demo of the BlackBar webapp. The call covers four primary domains: (1) the full intake workflow and document taxonomy, (2) the war book as a multi-phase artifact separate from intake, (3) the Mariz adoption constraint and what "winning her over" actually requires, and (4) Lane's voice training requirements and the historical data needed to achieve them. A total of 24 actionable extractions, 4 open items, and 5 conflicts with existing specs.

---

## Extractions

---

### EXTRACTION #1
**Source:** `00:18:45 – 00:21:28`  
**Category:** Architecture decision + intake requirement  
**Verbatim:** "First contact we have with a client — it's usually on a phone call, or it'll be in an email… sometimes we'll be sitting at a lunch with somebody, or on another job site… and they'll say, hey, by the way, I have another case… Marie's, when she's there, she'll start taking notes."

**Debate:**
- [PO] Intake is a multi-channel event, not a form submission. Current intake agent spec assumes structured input. This is an upstream requirement: any channel must produce the new case information sheet. This is a real gap.
- [AK] A model receiving phone-call transcripts, forwarded emails, and handwritten-notes-as-photos will need careful context assembly. The intake agent can't assume structured data. Needs a pre-intake normalization step.
- [BC] This implies: (a) a "quick capture" mode that accepts unstructured text/voice/email paste, (b) the intake agent must do entity extraction before form-filling. Two-step intake: capture → normalize → NCIS.
- [AD] Mobile capture is the primary surface for lunch and site-visit scenarios. A full intake form is wrong for those moments. Need a quick-capture card (5 fields max) that feeds into the full NCIS workflow once back at desk.

**Route:** `agents/intake/BlackBar-Intake.md` — add multi-channel input requirement; `webapp/src/pages/CaseIntake.tsx` — quick-capture mode  
**Status:** ACTIONABLE · [CONFLICT #1 — see Conflict Register]

---

### EXTRACTION #2
**Source:** `00:19:00 – 00:21:28`  
**Category:** Requirement — New Case Information Sheet field spec  
**Verbatim:** "It's usually 1 or 2 pages… the date we were contacted, sometimes the time, because sometimes it's that tight. Who contacted us? What the name of the matter is. Who are we representing, and what is the scope of work?"

**Lane-specified NCIS fields (complete list from transcript):**
| Field | Notes |
|---|---|
| Date of first contact | Sometimes time matters (conflict sensitivity) |
| Time of contact | "sometimes it's that tight" |
| Who contacted us | Name + firm/entity |
| Name of the matter | Case title/style |
| Our client | The party SCG represents |
| Opposing party | Person or entity |
| Our attorney / law firm | |
| Opposing attorney / law firm | |
| Third-party defendants | Multiple, each with attorney |
| Nature of case | One-paragraph synopsis |
| Scope of work | Consulting expert vs. disclosed expert |
| Engagement type | Initial report / rebuttal / supplemental |

**Debate:**
- [PO] This is more granular than what CaseIntake.tsx currently captures. The "time matters" note is a hard legal requirement (conflict check can depend on when you were first contacted).
- [AK] Third-party defendants are a variable-length list — can be 3-4 parties. The intake form needs a dynamic multi-party section, not static fields.
- [BC] Schema change required: Case model needs `contactDate`, `contactTime`, `engagingParties[]` (multi-record), `thirdPartyDefendants[]`. This is a `[SCHEMA CHANGE]`.
- [AD] The form should present parties as a visual list — "Add party" pattern. Party type dropdown: Client / Opposing / Third-Party Defendant / Law Firm. Don't put 8 static fields on one page.

**Route:** `webapp/prisma/schema.prisma` · `webapp/src/pages/CaseIntake.tsx` · `agents/intake/BlackBar-Intake.md`  
**Status:** ACTIONABLE · `[SCHEMA CHANGE]`

---

### EXTRACTION #3
**Source:** `00:20:15 – 00:29:31`  
**Category:** Architecture decision — Conflict check  
**Verbatim:** "We'll do a conflict check right on the phone. Sometimes we'll be sitting at a lunch with somebody… I need to be prepared for Maurice to take any of those 4 or 5 inputs… We can pretty well narrow it down to [which expert they'll hire] between 1 or 2 guys, depending on the law firm. That's how habitual they are."

**Conflict check vectors Lane described:**
1. Already engaged on the case for any named party
2. Conflicting third-party defendant relationship
3. Business/relationship blacklist (certain clients/firms SCG will not oppose)
4. Payment history — slow pay triggers upfront retainer requirement
5. Expert intelligence — which opposing expert is likely based on law firm pattern

**Debate:**
- [PO] Conflict check is currently not a first-class feature. Lane runs it mentally in real-time. For Mariz, this needs to be the first action after entering party names — before the full NCIS is created. It must work on mobile.
- [AK] The expert intelligence dimension (predicting likely opposing expert from law firm pattern) is a knowledge graph problem, not a simple name-match. Start with manual lookup; flag for future ML.
- [BC] Implement as: (1) party name entry → (2) instant conflict search against existing cases → (3) conflict result displayed before proceeding. Need a `ConflictCheck` table in schema: firm name, party name, conflict type, notes. Separate from the Case record.
- [AD] Conflict check result needs to be visually decisive. Green/red — not a "warning." If conflicted, show which case and party. This is a split-second decision moment (phone call in progress). Zero ambiguity.

**Route:** `docs/decisions/ADR-conflict-check.md` · `webapp/prisma/schema.prisma` · `webapp/server/routes/` (new `/conflict-check` endpoint) · `webapp/src/components/` (new `ConflictCheckModal`)  
**Status:** ACTIONABLE · `[SCHEMA CHANGE]` · `[OPEN: #1 — Expert intelligence database: who are the 6-7 local experts and their law firm affiliations? Lane has this. Needs to be captured as a reference table in the system.]`

---

### EXTRACTION #4
**Source:** `00:26:47 – 00:40:54`  
**Category:** Architecture decision — War book lifecycle  
**Verbatim:** "The war book… we don't build a war book until maybe the week before I have a depot… It's a condensation of all the work we've done from the new case information sheet until the depot… Sometimes these cases will run for 2 or 3 years."

**War book phase structure:**
| Phase | Trigger | Content |
|---|---|---|
| **Depot War Book** | ~1 week before deposition | All reports, key docs, condensed facts |
| **Trial War Book** | After Discovery closes | Everything through Discovery closure |
| **Final War Book** | Post-mediation/arbitration | Rolls in all prior war books + mediation record |

**Debate:**
- [PO] The war book is NOT the same as the case file or any single report. It is a time-indexed synthesis artifact. The current pipeline has no war book concept. This is a new entity type.
- [AK] Case lifecycle of 2-3 years means the agent must synthesize across a large, time-distributed document set. War book generation is a different task from report drafting — it requires temporal reasoning ("as of this date") not creative writing.
- [BC] War book as a document type in the schema: `WarBook` entity linked to `Case`, with `phase` enum (DEPOT | TRIAL | FINAL), `asOfDate`, `generatedAt`. Generate button on the case detail page, phase-aware.
- [AD] War book viewer must show provenance — what documents contributed to each section. Lane uses a 3-ring binder with tabs in the physical world. Digital equivalent: collapsible sections with source citations. This is a trust surface, not a document dump.

**Route:** `docs/decisions/ADR-warbook-lifecycle.md` · `webapp/prisma/schema.prisma` · agents spec update  
**Status:** ACTIONABLE · `[SCHEMA CHANGE]` · [CONFLICT #2 — see Conflict Register]

---

### EXTRACTION #5
**Source:** `00:48:00 – 00:49:12`  
**Category:** Architecture decision — Engagement agreement integration  
**Verbatim:** "Once we have that new case information sheet… we agree, okay, here's our one-page, or one- or two-page agreement that we make them sign. It's our standard agreement. It has discriminatory language in it, they… I sign it, they sign it, that's it, then we start work. That agreement should be plugged into this system."

**Debate:**
- [PO] Lane explicitly said the engagement agreement should be in the system. This is a template-fill requirement: auto-populate from NCIS data (parties, case name, scope) into a signed agreement. Document output, not just a form.
- [AK] The agreement has "discriminatory language" (confidentiality/exclusivity clauses). This is a legal document — BlackBar generates the draft, Lane or Mariz reviews and signs. No agent should output finalized legal language without HITL approval. `[AGENT BLIND]` on any agreement generation until Lane has reviewed it.
- [BC] New document type: `EngagementAgreement` linked to `Case`. Status: DRAFT → SIGNED. Template stored in system (Lane provides the canonical template). PDF output when complete.
- [AD] The agreement generation step belongs at the end of the intake flow — after conflict check passes, after NCIS is complete. It's a "proceed to work" gate. Visual: green "Proceed — Agreement Required" CTA.

**Route:** `agents/intake/BlackBar-Intake.md` · `webapp/prisma/schema.prisma` · component spec  
**Status:** ACTIONABLE · `[SCHEMA CHANGE]` · `[OPEN: #2 — Lane to provide the canonical engagement agreement template for ingestion into the system.]`

---

### EXTRACTION #6
**Source:** `00:49:42 – 00:52:06`  
**Category:** Architecture decision — Discovery document taxonomy  
**Verbatim:** "They'll do a data dump on us of a bunch of documentation. That may include video, it may include some stills, it may include statements from various different parties… And then we start reading depositions, and we go through this process called discovery."

**Document type taxonomy (Lane's complete list):**
| Type | Notes |
|---|---|
| Video surveillance | Processed through Adobe Premiere Pro |
| Still photographs | Wide → tight methodology |
| Incident reports | Primary source document |
| Medical records | ER visit + subsequent doctors |
| Witness statements | Multiple parties |
| Depositions | Multiple, taken over years |
| Affidavits | Lane's sworn statements, notarized by Mariz |
| Expert reports (SCG) | Initial / Rebuttal / Supplemental |
| Expert reports (opposing) | Requires analysis |
| Engagement correspondence | Emails, discovery exchanges |
| Contract documents | Construction disputes |
| Maintenance records | Equipment failure cases |

**Debate:**
- [PO] The document type list is richer than what the current schema captures. Each type has different handling requirements (video needs frame-by-frame analysis, medical records need timeline tracking).
- [AK] Video and photographs have different analysis pipelines than text documents. The research agent needs to route by document type, not treat all uploads as equivalent text.
- [BC] `Document` model needs `type` enum with the taxonomy above. Document viewer should surface type-specific metadata. Video documents need a `[AGENT BLIND]` flag until Vision/OCR capability is live.
- [AD] Document upload should prompt for type selection (or infer from file extension). The research agent's feed should group by document type. Users need to see "what's in this case" at a glance — a document type breakdown widget.

**Route:** `webapp/prisma/schema.prisma` · `ENTERPRISE_BRAIN.md` (document taxonomy section)  
**Status:** ACTIONABLE · `[SCHEMA CHANGE]` · [CONFLICT #3 — see Conflict Register]

---

### EXTRACTION #7
**Source:** `00:21:39 – 00:22:33`  
**Category:** Domain knowledge — Expert disclosure status  
**Verbatim:** "We'll initially simply be a consulting expert. And if they hold us as a consultant, they don't have to disclose us… We're not disclosed until they disclose us as an expert witness. And there is an actual formal legal disclosure to the other side."

**Status lifecycle:**
`CONSULTING` (undisclosed, privileged work product) → `DISCLOSED` (formal legal notice to opposing counsel) → `EXPERT WITNESS` (testifying)

**Debate:**
- [PO] Disclosure status is a case-level attribute that changes the privilege posture of all output. This is a critical field — the privilege header on deliverables depends on it.
- [AK] No model-behavior risk here. Simple state machine.
- [BC] Add `disclosureStatus` enum to `Case` model: CONSULTING | DISCLOSED | EXPERT_WITNESS. Privilege header on all Tier 1 output should reflect current status.
- [AD] Disclosure status should be visible in the case header on every page of the case detail view. Status change should require Lane's confirmation (not Mariz).

**Route:** `webapp/prisma/schema.prisma` · `ENTERPRISE_BRAIN.md` (engagement lifecycle section)  
**Status:** ACTIONABLE · `[SCHEMA CHANGE]`

---

### EXTRACTION #8
**Source:** `00:38:42 – 00:40:54`  
**Category:** Architecture decision — Historical data ingestion  
**Verbatim:** "I'm talking about cases that we brought in 3 or 4 years ago that are just now being resolved and or going to trial… In that file tree that you looked at, that's about 5 years worth of stuff… for you to see a war book, for example… that case goes way before 2026."

**Debate:**
- [PO] The current plan was to ingest 2026 cases. Lane is clear: active cases span 3-5 years. The agent needs exposure to the full case lifecycle to generate valid war books. 2026-only is insufficient.
- [AK] Voice training also benefits from breadth. 5 years of Lane's writing captures his voice evolution — the early cases show how his patterns were established.
- [BC] Ingestion task: NAS → structured case documents by year → import pipeline. Caleb has confirmed access to the NAS upstairs (gigabit-connected). Starting with 3 years is reasonable; 5 years is the goal.
- [AD] No UI impact — this is a backend ingestion task.

**Route:** `docs/decisions/ADR-data-ingestion.md` · ingestion script spec  
**Status:** ACTIONABLE · [CONFLICT #4 — see Conflict Register]

---

### EXTRACTION #9
**Source:** `00:56:22 – 00:57:00`  
**Category:** Domain knowledge + agent requirement — Case mantra  
**Verbatim:** "Every case has its mantra. It's a succinct statement of why we're… we should win… I've got to take somebody that's gonna have about a 6th grade level understanding of what I'm talking about. And I've got to help them understand, in some measure of detail, the technical aspects of it."

**Debate:**
- [PO] The case mantra is a first-class deliverable, not just a summary. It must be established early (at the end of intake/research) and then enforced throughout drafting and QA. Every report should trace back to the mantra.
- [AK] "6th grade comprehension" is a real constraint — the drafting agent's temperature and vocabulary choices should be calibrated to this. Technical jargon must be immediately explained.
- [BC] Add `caseMantra` field to `Case` model (text). Drafting agent should receive the mantra as a constraint in its system prompt. QA agent should check every paragraph against the mantra.
- [AD] The case mantra should be pinned to the top of every stage view in the case detail — a persistent visual anchor. Lane mentally returns to it constantly; the UI should make that natural.

**Route:** `webapp/prisma/schema.prisma` · `agents/drafting/BlackBar-Drafting.md` · `agents/qa/BlackBar-QA.md` · component spec  
**Status:** ACTIONABLE · `[SCHEMA CHANGE]`

---

### EXTRACTION #10
**Source:** `01:09:17 – 01:09:57`  
**Category:** Voice directive + report formatting requirement  
**Verbatim:** "I want the work product to look pretty much the same. I don't want some radical change to how my reports look… People copy our outline. We basically set the standard for that."

**Debate:**
- [PO] Report format consistency is a hard requirement, not a preference. The fact that competitors copy their outline means any deviation is immediately visible to the legal community. Format is brand.
- [AK] The drafting agent must receive the exact structural template (section headers, numbering, spacing) as a hard constraint — not a soft style guide. Template deviation is a QA gate failure.
- [BC] Need to ingest the Heagy golden case format as the canonical template. The QA agent must verify structural conformance against the template, not just voice conformance.
- [AD] The export (PDF/Word) must match Lane's existing report format pixel-for-pixel. Current export is producing unformatted text. This is blocking production use.

**Route:** `VOICE.md` (amendment: format constraint is hard, not soft) · `agents/qa/BlackBar-QA.md` · export spec  
**Status:** ACTIONABLE · `[VOICE AMENDMENT]` · [CONFLICT #5 — see Conflict Register]

---

### EXTRACTION #11
**Source:** `01:01:06 – 01:01:34`  
**Category:** Voice directive — AI attribution policy  
**Verbatim:** "I would look at AI as a tool… I wouldn't tell anybody, hey, I had AI write my report, I'd say, I used AI in doing some research. And in assembling some information. But that report's mine, and those opinions are mine. AI might have helped to organize them, but this is my document, this is my work product."

**Debate:**
- [PO] This is Lane's official position on AI attribution. It must be codified in VOICE.md and in how BlackBar is positioned to any third party who asks. This framing should inform the QA agent's self-description.
- [AK] This framing is legally defensible and accurate — it's correct to describe the system this way. No model behavior risk.
- [BC] This should be in the system prompt for all agents as the "what is BlackBar" framing if the question ever arises.
- [AD] This has implications for UI copy. Nothing on the BlackBar interface should say "AI wrote your report." The HITL checkpoint page language should reflect "AI-assisted assembly, expert opinion."

**Route:** `VOICE.md` — new section on AI attribution framing · `.claude/CLAUDE.md` agent system prompts  
**Status:** ACTIONABLE · `[VOICE AMENDMENT]`

---

### EXTRACTION #12
**Source:** `01:18:52 – 01:19:20`  
**Category:** Voice directive — One-correction rule  
**Verbatim:** "There are certain phrases and certain manners of speech that AI will plug in, and I have to correct it every friggin' time I go through a draft… I should only have to correct that phrase once, and don't ever use it again. Use my voice."

**Debate:**
- [PO] This is a direct product requirement: correction feedback must persist. When Lane edits a draft and removes a phrase, that correction must be saved and enforced in all future runs. This is a feedback loop, not a one-time edit.
- [AK] Practically: this means maintaining a "prohibited phrases for this user" list that grows from corrections. The QA agent (voice_check.sh) already has some of this. The correction UI must feed back into VOICE.md automatically.
- [BC] Correction capture: when Lane edits a draft, the system diffs the before/after, identifies removed phrases, and surfaces "Add to prohibited phrases?" prompt. Mariz's corrections should NOT automatically update the list — Lane approval required.
- [AD] The QA stage needs a "Voice Corrections" panel that shows what was flagged and why. Every flag should be traceable to a rule. Lane can accept, override, or add to the prohibited list from this panel.

**Route:** `VOICE.md §21` (prohibited phrases list is dynamic, grows from corrections) · `agents/qa/BlackBar-QA.md` · `webapp/src/pages/CaseQA.tsx` component spec  
**Status:** ACTIONABLE · `[VOICE AMENDMENT]`

---

### EXTRACTION #13
**Source:** `01:19:16 – 01:19:57`  
**Category:** Voice requirement — Historical voice training  
**Verbatim:** "I don't think it's seen enough yet. It needs to go back and see how my voice evolved. And I'm talking about cases that we brought in 3 or 4 years ago that are just now being resolved… If we just looked at 3 years' worth. In that file tree that you have access to upstairs."

**Debate:**
- [PO] Confirmed: 2026-only training corpus is insufficient. Lane's voice has evolved; the system needs the arc, not just the current moment. 3-5 years is the target.
- [AK] Voice fingerprinting across 3-5 years of reports will capture Lane's stylistic range across case types (initial vs. rebuttal vs. supplemental) and subject matter (construction, hotel safety, equipment failure). Richer training = more defensible voice.
- [BC] NAS ingestion pipeline needs to pull reports (not raw case files — only Lane's authored documents) and run `voice_fingerprint.py` across the corpus. Build a training index.
- [AD] No UI impact.

**Route:** `docs/decisions/ADR-data-ingestion.md` · `scripts/voice_fingerprint.py` update  
**Status:** ACTIONABLE

---

### EXTRACTION #14
**Source:** `01:03:05 – 01:04:18`  
**Category:** Mariz constraint — Design philosophy  
**Verbatim:** "I have to get her to become more of an owner of this black bar thing… I want it to look to her like the flow that I'm trying to describe to you… When I sit down with Maryse, I want her to see something where she goes, oh, I get what this is. That's how we do our work. I don't want her to say, oh, I gotta learn a new process."

**Debate:**
- [PO] This is the single most important acceptance criterion for the Mariz demo. "That's how we do our work" is the success phrase. Every screen must map to an existing SCG practice she already performs.
- [AK] No AI model risk. Pure UX problem.
- [BC] Implementation implication: the intake flow must mirror the NCIS process Lane described — same sequence, same terminology. Don't invent new names for existing steps.
- [AD] Design mandate: every stage label, every field label, every button must use Lane's vocabulary from this call. "New Case Information Sheet" not "Case Intake Form." "Conflict Check" not "Validation." "War Book" not "Summary Document." The UI vocabulary is Lane's vocabulary.

**Route:** `webapp/src/pages/CaseIntake.tsx` (copy/label audit) · `BLACKBAR_UI_SPEC_v3.md` amendment · component specs  
**Status:** ACTIONABLE · `[UI SPEC]`

---

### EXTRACTION #15
**Source:** `01:00:31 – 01:01:14`  
**Category:** Mariz constraint — Shadow AI problem  
**Verbatim:** "Up until about 4 weeks ago, she didn't know I was aware she was using AI. I knew she was, and I had to go in and work on her work product to me, like, drafts and stuff, and try to give it my voice, because it read like AI."

**Debate:**
- [PO] Mariz's secret ChatGPT use is producing AI-voiced drafts that Lane then has to manually correct. BlackBar solves this by making the AI usage official, auditable, and voice-compliant. The pitch to Mariz: "this does what you're trying to do with ChatGPT, but it actually sounds like Lane."
- [AK] This is the core product value proposition for Mariz: she's already using AI, badly. BlackBar is better AI, properly configured. Frame it as an upgrade, not a replacement.
- [BC] Admin visibility is real: Lane confirmed he is admin in both BlackBar and ChatGPT. Caleb confirmed Lane will be admin in BlackBar. All of Mariz's activity should be visible to Lane.
- [AD] Mariz-facing UI should not feel like surveillance. Frame her activity log as "work history" not "monitoring." Lane's admin view can be more explicit, but her view shows her own productivity.

**Route:** `ENTERPRISE_BRAIN.md` (Mariz stakeholder section) · `webapp/src/pages/` (admin vs. user view differentiation)  
**Status:** ACTIONABLE · `[UI SPEC]`

---

### EXTRACTION #16
**Source:** `01:11:36 – 01:12:04`  
**Category:** Mariz constraint — Adoption strategy  
**Verbatim:** "She's got to see you as just somebody that's giving her another tool that she can use to be more efficient, more productive."

**Debate:**
- [PO] Caleb's adoption strategy: "make the software so easy that their job becomes so much easier that they can't live without it." This is the right frame. The first 3 things Mariz does in BlackBar must each save her time vs. her current method.
- [AK] No model risk.
- [BC] The onboarding flow for Mariz must demonstrate immediate value. Suggestion: start her with a real case she's worked on — run intake on it so she sees something she already knows represented correctly.
- [AD] First-run experience matters. The first screen Mariz sees in BlackBar should not be a blank dashboard — it should show an in-progress case she already knows. "Show, don't tell."

**Route:** `webapp/src/pages/Dashboard.tsx` (first-run experience) · component spec  
**Status:** ACTIONABLE · `[UI SPEC]`

---

### EXTRACTION #17
**Source:** `00:07:02 – 00:07:14`  
**Category:** UI/UX — Nomenclature fix  
**Verbatim:** "So it's basically uploading, not downloading, right? I mean, if it's going to my computer, isn't this an upload?"

**Debate:**
- [PO] Lane caught an incorrect label. "Download PDF" from the QA stage should be "Save Report to Computer" or split into two distinct actions: "Save to Computer" (local) and "Send to Client" (future). This is a UX terminology fix.
- [AK] No model risk.
- [BC] Simple copy fix in `webapp/src/pages/CaseExport.tsx`. Low blast radius.
- [AD] The export action should be clearly labeled by what happens, not the technical direction. "Download" is tech jargon. "Save Report as PDF" and "Save Report as Word Document" are user-intent language.

**Route:** `webapp/src/pages/CaseExport.tsx` · any other "Download" labels in the UI  
**Status:** ACTIONABLE · `[UI SPEC]`

---

### EXTRACTION #18
**Source:** `00:27:39 – 00:28:05`  
**Category:** UI/UX — Mobile conflict check  
**Verbatim:** "What… what I'm hearing you say is that… on desktop and on mobile… perform on-the-spot conflict check." (Caleb synthesizing Lane's description; Lane confirmed.)

**Debate:**
- [PO] Mobile is a hard requirement for conflict check, not a nice-to-have. Lane runs conflict checks during phone calls and at lunch — neither scenario involves a desktop.
- [AK] No model risk. Conflict check is a fast lookup, appropriate for mobile.
- [BC] Conflict check needs to be accessible as a standalone flow — not requiring navigation through the full case creation wizard. A `/conflict-check` route accessible from the dashboard.
- [AD] Mobile conflict check = bare minimum fields (party names only) with immediate result. Three states: CLEAR (green), CONFLICTED (red, shows which case), REVIEW REQUIRED (yellow, flagged for Lane). No other UI needed at that moment.

**Route:** `webapp/src/components/` (new `ConflictCheckModal`, mobile-responsive) · `webapp/server/routes/`  
**Status:** ACTIONABLE · `[UI SPEC]`

---

### EXTRACTION #19
**Source:** `00:24:44 – 00:25:37`  
**Category:** Domain knowledge — Courtroom communication strategy  
**Verbatim:** "Don't put it on a screen. Print it and put it up on a trestle in front of them, have it be large… the succinct encapsulation of our entire case. Have that be the thing that they constantly look at when they get bored and turn away."

**Debate:**
- [PO] This is courtroom strategy, not a current BlackBar feature requirement. But it informs what the war book and export formats need to produce: large-format, high-contrast, print-ready exhibit versions of key case points.
- [AK] No model risk.
- [BC] Export variants (future): standard report (Word/PDF) + exhibit-ready version (large format, simplified, print-optimized).
- [AD] The exhibit-ready export is a future surface: succinct, high-contrast, designed for 24"+ print. Typography: Fraunces headings, Inter Tight body, 18pt+ minimum. Each point stands alone. Future PR.

**Route:** `ENTERPRISE_BRAIN.md` (courtroom communication section) · future export spec  
**Status:** ACTIONABLE (future) · `[OPEN: #3 — Exhibit-ready export format: Lane to specify what the "trestle" version looks like. Photos of a real exhibit board would help.]`

---

### EXTRACTION #20
**Source:** `01:09:57 – 01:10:27`  
**Category:** Voice directive — No field notes / site note-taking policy  
**Verbatim:** "That's why I don't take a lot of notes. When I go out on a site, you don't see me writing notes, you don't see me dictating into a… I keep it here, and we keep… we let the photos speak for themselves."

**Debate:**
- [PO] Lane's workflow is memory + photos — not notes. BlackBar cannot require Lane to take notes on site. The input for site visits is photographs and Lane's after-visit recall.
- [AK] Memory + visual input means the system needs to support a post-visit "dictation" flow where Lane describes what he saw from memory and the agent structures it. Don't force typed notes.
- [BC] The CaseIntake/CaseResearch flow needs a "Post-Visit Recall" input mode. Audio transcription → agent structure. Future capability.
- [AD] The upload UI must NOT have a mandatory "notes" field for site visit cases. Photos are the primary evidence type. Caption auto-generation from image content is the right approach once Vision is live.

**Route:** `ENTERPRISE_BRAIN.md` (site visit workflow section) · `webapp/src/pages/CaseIntake.tsx` (no mandatory notes field)  
**Status:** ACTIONABLE

---

### EXTRACTION #21
**Source:** `01:10:07 – 01:10:27`  
**Category:** Domain knowledge — Photography methodology  
**Verbatim:** "Hey, let this go wide, then go tight. Let the photo speak for itself. You shouldn't have to have a caption on your photo. Somebody should be able to look at that photo and go, oh, that's what that is."

**Debate:**
- [PO] The wide → tight shot sequence is Lane's documentary protocol. It's also how photos should be organized in the case evidence viewer: wide establishing shots first, then detail shots.
- [AK] Auto-captioning should be applied where captions exist — but Lane's point is that good photos shouldn't need captions. The vision agent (future) should assess whether a photo "speaks for itself."
- [BC] Photo upload should infer sequence: if photos are uploaded in sets, prompt "Is this wide-to-tight?" and group accordingly.
- [AD] The evidence viewer should present photo sequences as paired cards: wide + tight. This reinforces Lane's methodology in the UI naturally.

**Route:** `ENTERPRISE_BRAIN.md` (photography methodology section) · future image viewer component spec  
**Status:** ACTIONABLE (partially future — Vision)

---

### EXTRACTION #22
**Source:** `01:09:09 – 01:09:15`  
**Category:** UI/UX — Savage Wins / bear branding scope  
**Verbatim:** "The Savage Wins thing, I can go with that on an in-house basis. I won't put it on any of my product I put out, because then it seemed by the third-party Finder effect, like, what is this bear with savage winds? What the that?"

**Debate:**
- [PO] Lane confirmed: bear + "Savage Wins" is internal brand only. No client-facing or court-produced output should carry the bear mascot, tagline, or any BlackBar branding.
- [AK] No model risk.
- [BC] The export templates (Word, PDF) must be plain SCG letterhead — no BlackBar visual identity.
- [AD] Two visual identities: (1) BlackBar internal — bear, Forensic Noir design system, dark palette; (2) SCG client-facing — Lane's existing letterhead. Export must produce (2), not (1).

**Route:** `BLACKBAR_UI_SPEC_v3.md` (branding scope section) · export template spec  
**Status:** ACTIONABLE · `[UI SPEC]`

---

### EXTRACTION #23
**Source:** `01:13:13 – 01:13:24`  
**Category:** Product vision — Scale goal  
**Verbatim:** "In this instance, I want to make it so two people can be productive."  
**Caleb at `01:12:29`:** "Turning your office into a place where you can go from 2 people putting out casework to an office of 6 people, but only working with 2 people."

**Debate:**
- [PO] The product vision is 2 people with the throughput of 6. This is the north star for every architecture and UX decision. It also positions BlackBar as a competitive advantage over competitors who work solo without staff.
- [AK] No model risk.
- [BC] This frames the automation priority: maximize agent throughput for research and drafting, minimize time Lane and Mariz spend on rote tasks.
- [AD] This north star should inform the onboarding framing. When Mariz first logs in: "This is your force multiplier."

**Route:** `ENTERPRISE_BRAIN.md` (product vision section)  
**Status:** ACTIONABLE

---

### EXTRACTION #24
**Source:** `01:09:09 – 01:09:34`  
**Category:** Product vision — BlackBar as managed service  
**Verbatim:** "This could be a managed service. We could end up making a lot of money off this."

**Debate:**
- [PO] Lane validated the managed service concept. This doesn't change the current build scope but means architecture decisions should not create lock-in that prevents multi-tenancy later.
- [AK] No model risk.
- [BC] Multi-tenancy is a future concern. Current architecture (Railway + PostgreSQL) can support it with tenant isolation added later. Don't over-engineer now.
- [AD] No UI impact yet.

**Route:** `ENTERPRISE_BRAIN.md` (product vision) · flag for future architecture consideration  
**Status:** ACTIONABLE (future)

---

## Routing Summary

| Target Artifact | Extraction #s | Action Required |
|---|---|---|
| `VOICE.md` | #10, #11, #12 | Amendment proposals (see below) |
| `agents/intake/BlackBar-Intake.md` | #1, #2, #5 | Multi-channel + NCIS field spec + agreement gate |
| `agents/drafting/BlackBar-Drafting.md` | #9 | Case mantra constraint in system prompt |
| `agents/qa/BlackBar-QA.md` | #9, #10, #12 | Mantra check + format conformance + correction capture |
| `webapp/prisma/schema.prisma` | #2, #3, #4, #5, #6, #7, #9 | Multiple schema additions |
| `webapp/src/pages/CaseIntake.tsx` | #1, #2, #14, #20 | Multi-channel, dynamic party list, no mandatory notes |
| `webapp/src/pages/CaseExport.tsx` | #17, #22 | Label fix + SCG-only export template |
| `webapp/src/pages/CaseQA.tsx` | #12 | Voice Corrections panel |
| `webapp/src/pages/Dashboard.tsx` | #16 | First-run experience for Mariz |
| `webapp/src/components/` (new) | #3, #18 | ConflictCheckModal (mobile-responsive) |
| `docs/decisions/ADR-conflict-check.md` | #3 | New ADR |
| `docs/decisions/ADR-warbook-lifecycle.md` | #4 | New ADR |
| `docs/decisions/ADR-data-ingestion.md` | #8, #13 | NAS ingestion plan + voice corpus |
| `ENTERPRISE_BRAIN.md` | #6, #7, #15, #19, #20, #21, #23, #24 | Domain knowledge additions |
| `BLACKBAR_UI_SPEC_v3.md` | #14, #22 | Vocabulary + branding scope |
| `[OPEN ITEMS]` | #3, #5, #19, #25 | Need follow-up from Lane |

---

## Conflict Register

**CONFLICT #1 — Intake is multi-channel, not form-driven**  
- **Existing spec:** `CaseIntake.tsx` and intake agent assume a structured form submission as the entry point.  
- **Lane's directive:** Intake begins on a phone call, at lunch, or at a job site. The first step is capture, not form-filling.  
- **Resolution:** Add a "Quick Capture" mode that accepts unstructured text/paste and normalizes it via the intake agent into the NCIS form. The existing form becomes the *output* of intake normalization, not the entry point.

**CONFLICT #2 — War book is not in the current pipeline**  
- **Existing spec:** Pipeline is Intake → Research → Drafting → QA. No war book stage.  
- **Lane's directive:** War book is a real, distinct artifact type with 3 phases (Depot, Trial, Final), triggered by deposition/trial prep events, not by the drafting agent.  
- **Resolution:** War book is not a pipeline stage — it's an on-demand synthesis action within a new "Prepare" capability. Add `WarBook` entity to schema. Generate button is case-scoped, not pipeline-sequential.

**CONFLICT #3 — Document type system is underdeveloped**  
- **Existing spec:** `Document` model exists but without type-specific handling.  
- **Lane's directive:** 11 distinct document types with different analysis requirements (video requires Premiere Pro preprocessing, medical records require timeline tracking).  
- **Resolution:** Add `DocumentType` enum to schema and route each type to the appropriate agent behavior.

**CONFLICT #4 — Training corpus scoped to 2026 only**  
- **Existing spec:** `.claude/CLAUDE.md` note says "run all of 2026" as the first ingestion step.  
- **Lane's directive:** Voice training requires 3-5 years of case data. Active cases span that range. 2026-only produces insufficient voice signal.  
- **Resolution:** The 2026 corpus is still the first milestone. Plan for full NAS ingestion (3-5 years) as the next phase. The upstairs machine with the gigabit-connected NAS is the source.

**CONFLICT #5 — Report format is unspecified in the current QA agent**  
- **Existing spec:** QA agent checks voice conformance but not structural/visual format conformance.  
- **Lane's directive:** Report format is as important as voice — competitors copy the outline, and any deviation is visible to the legal community.  
- **Resolution:** QA agent needs a structural template check in addition to voice check. The golden case format provides the canonical template.

---

## Voice Amendments Proposed

**Amendment 1 — Add: AI attribution framing (new section after §21)**
```
## AI Attribution (Lane's Position)
AI is a research and assembly tool. It is never the author.
Acceptable framing: "I used AI in doing some research and in assembling some information.
Those are my opinions, my document, my work product."
Prohibited framing: "AI wrote my report" / "AI generated this analysis"
This applies to any external communication — client, counsel, court.
```

**Amendment 2 — §21 extension: One-correction rule**
```
When Lane corrects an AI-generated phrase in a draft, that phrase is added to
the prohibited list automatically (pending Lane approval).
Mariz corrections do NOT auto-update the list — requires Lane sign-off.
```

**Amendment 3 — Add: Report format consistency constraint**
```
## Report Format (Hard Rule)
Output format must match Lane's existing report structure exactly.
Section headers, numbering, spacing: derived from golden case template.
Competitors copy this outline. Deviation is a QA gate failure, not a style note.
The template is sourced from the golden cases — not regenerated.
```

---

## UI/UX Requirements Surfaced

**[UI SPEC 1] — Vocabulary audit**  
Every label in the intake flow must use Lane's terminology: "New Case Information Sheet" (not "Case Intake Form"), "Conflict Check" (not "Validation"), "War Book" (not "Summary Document"), "Scope of Work" (not "Assignment Details"), "Engagement Agreement" (not "Contract"). Run a complete copy audit against the vocabulary list extracted in #2.

**[UI SPEC 2] — Quick Capture mode (mobile-first)**  
A minimal capture surface: 5 fields only (case name, our client, opposing party, our attorney, nature of case) + a free-text field for anything else. Submit → intake agent normalizes to full NCIS. Accessible from mobile dashboard without entering the full case creation wizard.

**[UI SPEC 3] — Conflict check result states**  
Three states: CLEAR (green — proceed), CONFLICTED (red — shows which case and which party), REVIEW REQUIRED (yellow — requires Lane decision). Lane-only authority to override a CONFLICTED result.

**[UI SPEC 4] — Case mantra pinned to every stage**  
The case mantra field appears as a persistent banner at the top of every stage view (Research, Drafting, QA). Editable only by Lane. Every agent output references it. Every QA flag explains how it relates to the mantra.

**[UI SPEC 5] — Export: internal vs. external template**  
Two export paths: (1) Internal draft — BlackBar letterhead with `[DRAFT — PRIVILEGED]` watermark; (2) Client export — SCG letterhead, no BlackBar visual identity, no bear, no taglines. Path selection is explicit, not implicit.

**[UI SPEC 6] — Admin vs. user view**  
Lane's admin view shows all of Mariz's session activity, case edits, and agent runs. Mariz's view shows her own activity as "work history." Same data, different framing. Mariz should not see a surveillance dashboard.

**[UI SPEC 7] — War book phase selector**  
When generating a war book, Lane selects: DEPOT PREP / TRIAL PREP / FINAL (post-mediation). The `asOfDate` field auto-populates but is editable. The war book viewer shows which documents contributed to each section, with source citations.

---

## Open Items

| # | Item | Owner | Priority |
|---|---|---|---|
| `[OPEN: #1]` | Expert intelligence database: 6-7 local experts + law firm affiliations. Lane has this in his head. Needs to be captured as a reference table. | Lane → Caleb | High |
| `[OPEN: #2]` | Canonical engagement agreement template. Lane to provide the actual 1-2 page standard agreement for ingestion as the fill-in template. | Lane | High |
| `[OPEN: #3]` | Exhibit-ready export format. Lane to send photos/description of what the "trestle" exhibit board looks like. | Lane | Medium |
| `[OPEN: #4]` | Legacy SOPs written by "Debbie" (military background). Lane/Lori to locate — hardcopy and/or digital. These establish the canonical workflow baseline. | Lane/Lori | Medium |

---

## Quality Gate

| Check | Status |
|---|---|
| All four personas spoke in every deliberation | ✓ All 24 extractions have all four voices |
| Engagement isolation respected | ✓ Case anecdotes used for pattern extraction only; no case-specific facts in tool repo |
| No §21 violations in any output | ✓ |
| Extractions routed to correct artifacts | ✓ 24/24 routed |
| Conflicts with existing specs surfaced | ✓ 5 conflicts documented with resolutions |
| UI elements survive "why does this exist" challenge | ✓ All 7 UI specs justified against Lane's stated requirements |
| Tier 1 outputs confirmed before delivery | n/a — Tier 2 internal report |
| Open items tracked with `[OPEN: ...]` | ✓ 4 open items |

---

`[PATTERN: The "Mariz constraint" — making a tool indispensable by mapping it to existing workflow vocabulary and demonstrating immediate time savings — is abstractable as a general adoption strategy for any AI-assisted expert practice tool where a non-technical intermediary is the primary daily user.]`

`[PATTERN: Multi-channel intake → normalization → structured artifact is a recurring pattern in professional services. The "quick capture → NCIS" flow applies anywhere intake happens across phone, email, and in-person channels simultaneously.]`
