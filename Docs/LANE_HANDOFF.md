# How to Use BlackBar
**For:** Lane Swainston · Mariz Arellano
**Date:** 2026-04-20

---

## Login

Go to the BlackBar URL and log in with your SCG credentials.

---

## Creating a Case

1. From the Dashboard, click **New Case**.
2. Fill in: case name, case type (slip/fall, trip/fall, etc.), report type (Initial / Rebuttal / Supplemental), jurisdiction, opposing expert name, deadline.
3. Click **Create Case**. You land on the Intake page.

---

## Step 1: Add Case Materials

On the Intake page you'll see three sections:

**Documents** — Drop PDFs, DOCX, or TXT files here. Expert reports, depositions, code standards, correspondence. The agent will extract and reason over all text.

**Photos** — Drop JPG, PNG, or other image files here. After you run the Intake agent, text in photos is automatically extracted (OCR). Photos without OCR show a small **BLIND** badge — that clears after Intake runs.

**Notes** — Type contextual notes in the text box. "Plaintiff claims she didn't see the transition." "Opposing expert used ANSI A326.3-2021 but permit pre-dates it." These feed directly into the agent's analysis.

---

## Step 2: Run the Pipeline

Once materials are uploaded, click **Run Intake** in the Run Analysis card.

Watch the **Agent Activity** feed on the right. Each finding appears as it's discovered. The whole intake run takes 60–90 seconds.

When the Intake agent finishes, a **Human Checkpoint** appears. Review the findings summary:
- **Findings** — what the agent flagged as attack opportunities
- **Documents** — how many files were processed
- **QA Score** — preview (if shown)

Then choose:
- **Approve & Continue** — moves to Research
- **Revise** — type correction instructions, agent re-runs with your feedback
- **Dismiss** — stay on Intake to add more materials

Each stage (Research → Drafting → QA) follows the same pattern: run → review → approve.

---

## Step 3: Review the Draft

After Drafting, go to the **Draft** tab. The report is editable — click any section to modify. All changes are saved automatically.

---

## Step 4: QA

The QA agent scores the draft 0–100. At the checkpoint:
- **≥ 85** — Courtroom ready
- **70–84** — Marginal — review flagged items
- **< 70** — Needs revision

The QA scorecard shows every check and any issues. Expand a check to see the detail.

A **Layer 2 Voice Conformance** check also runs automatically — it verifies the draft doesn't contain prohibited terminology (§11/§21).

---

## Step 5: Export

Go to the **Export** tab. Three options:
- **Save Report as PDF** — SCG-branded PDF with headers/footers
- **Save Report as DOCX** — Word document, 12pt Times, 1-inch margins
- **Save Report as HTML** — Client-side download

The file downloads to your computer immediately.

---

## If Something Goes Wrong

- **Agent errors** appear in the activity feed in red. Read the message — it usually says what's missing (missing API key, empty documents, etc.).
- **Pipeline stuck** — refresh the page. The case state is saved; you can re-run any stage.
- **Contact Caleb:** cswainston@gmail.com
