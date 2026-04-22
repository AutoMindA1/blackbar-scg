# BlackBar Master Build Plan — BOOGIE.md
**Produced by:** Swainston AI Committee v2.0
**Date:** 2026-04-20
**North Star:** Lane and Mariz run BlackBar independently — raw case inputs in, voice-compliant SCG expert report out, no Caleb in the loop.
**Repo:** AutoMindA1/blackbar-scg
**Current branch:** `pr1/notes-first-class-capture` (pushed, PR not yet opened)
**Base SHA (main):** dd00ac0a

---

## Execution Context

This plan is consumed by Claude Code on Caleb's Mac (`~/BLACK-BAR`). It reconciles three work streams into one sequenced sprint:

1. **STATE.md 5-PR sequence** (Notes, Image Preview, Image OCR, Unified Capture, Railway Deploy)
2. **24-extraction report** from Lane architecture discussion (5 conflicts, 7 UI specs, 3 VOICE.md amendments, 4 open items)
3. **30 local-only files** on Mac that GitHub has never seen (Layer 2 scripts, skills, docs, agents, tests)

Codex will be checking all work. No verbose output. Ship clean.

---

## Phase 0 — Repo Hygiene (pre-sprint)

**Goal:** Get the repo to reflect reality. Commit local-only artifacts that support the build. Do NOT commit secrets or privileged case data.

### 0.1 Open PR 1

```bash
gh pr create --repo AutoMindA1/blackbar-scg \
  --base main \
  --head pr1/notes-first-class-capture \
  --title "PR 1: Notes — First-Class Capture Surface" \
  --body "Adds Note model, CRUD routes, NoteList component, Intake agent integration. Includes 3 Prisma migrations and ultrareview bug fixes (QueryClientProvider, 204 handling, STATE.md buildCommand)."
```

If `gh` is not installed: `brew install gh && gh auth login`.

### 0.2 Stage untracked files that belong in the repo

```bash
cd ~/BLACK-BAR

# Prisma migrations (MUST go with PR 1)
git add webapp/prisma/migrations/

# Tests
git add webapp/tests/golden/notes.test.ts

# .env.example (safe — no secrets)
git add webapp/.env.example

# Layer 2 voice conformance scripts
git add scripts/

# Docs (extraction report, architecture, specs)
git add docs/transcripts/architecture-discussion-extraction.md
# NOTE: docs/ also has PDFs/DOCX — add selectively, skip binaries >5MB

# Tests golden setup
git add tests/golden/README.md tests/golden/.voice-bless-pending

# v1.0 agent specs (reference, not active)
git add agents/
```

**DO NOT commit:**
- `.envy` (likely a misnamed `.env` — secrets)
- `.DS_Store` files
- `benchmarks/` (privileged case PDFs — must stay local)

### 0.3 Commit and push

```bash
git add -p  # Review each hunk
git commit -m "chore: commit local-only artifacts — Layer 2 scripts, migrations, docs, agent specs, tests"
git push
```

### 0.4 Add `.claude/` tooling to repo (selective)

The `.claude/` directory has skills and commands that ARE part of the tool repo (SCG IP). Commit the non-secret parts:

```bash
git add .claude/commands/ultraplan.md
git add .claude/skills/swainston-ai/
git add .claude/skills/blackbar-legion/
git add .claude/skills/aisdlc-governance/
git add .claude/skills/aisdlc-orchestrator/
git add .claude/skills/aisdlc-qa/
git add .claude/skills/qa-pipeline/
git add .claude/PERSONA_CHERNY_DANNAWAY.md
# DO NOT commit .claude/settings.local.json (may contain tokens)
# DO NOT commit .claude/CLAUDE.md (already tracked, changes are on PR1 branch)
git commit -m "chore: add Claude Code skills, commands, and persona to repo"
git push
```

---

## Phase 1 — PR 1: Notes as First-Class Capture (MERGE)

**Status:** Code complete, branch pushed, PR not yet opened.
**Branch:** `pr1/notes-first-class-capture`

### What's in it
- `Note` Prisma model with case relation, author tracking, pinning
- `/api/cases/:id/notes` CRUD routes with Zod validation
- `NoteList.tsx` component in CaseIntake
- 3 Prisma migrations: `0_init`, `add_note_model`, `add_agent_log_feedback`
- Ultrareview fixes: QueryClientProvider, 204 empty-body, STATE.md buildCommand

### Pre-merge checklist
- [ ] `npm run build` passes clean
- [ ] Prisma migrations apply on fresh DB (`npx prisma migrate deploy`)
- [ ] Create case, add note, verify persistence
- [ ] Run Intake agent — confirm findings reference note content
- [ ] No TypeScript errors, no lint warnings

### After merge
```bash
git checkout main && git pull
```

---

## Phase 2 — PR 2: Image Preview + Extraction UI Polish

**Branch:** `pr2/image-preview-ui-polish`
**Combines:** STATE.md PR 2 + extraction report UI items

### 2.1 Image Preview Modal (STATE.md PR 2)
- New: `webapp/src/components/shared/ImagePreviewModal.tsx`
- Blurred backdrop, 24px radius, keyboard arrow nav, Escape close, 180ms ease-out
- Wire Eye icon in FileDropzone to open modal for image MIME types
- Inline `[AGENT BLIND]` badge: "Human review only. Agent does not read image content yet."

### 2.2 Export Button Rename (Extraction #16)
- `CaseExport.tsx`: Change "Download PDF" / "Download DOCX" / "Download HTML" to "Save Report as PDF" / "Save Report as DOCX" / "Save Report as HTML"
- Button text only — no functional change

### 2.3 BearMark Consistency (Extraction UI items)
- Audit all BearMark usages across pages (Dashboard, CaseIntake, CaseExport, empty states)
- Standardize size, glow behavior, and placement per DESIGN_SYSTEM.md
- BearMark in export: static only, no pulse/glow in production documents

### 2.4 Stage Navigation Refinements (Extraction UI items)
- StageNavV2: replace stage-specific hues with v2 pill state pattern per MIGRATION.md
- Ensure disabled stages are visually distinct (not just greyed — use border + opacity pattern)

### 2.5 User Role Enforcement (Extraction report item)
- User model already has `role` field (default "operator")
- Add role enum values: `operator`, `expert`, `admin`
- Prisma migration: `add_user_role_enum`
- Seed script: Lane = `expert`, Mariz = `expert`
- No RBAC enforcement yet — just the data model. Gate enforcement is a future PR.

### Ship criteria
- Image preview opens/closes/navigates with keyboard
- `[AGENT BLIND]` badge visible
- Export buttons say "Save Report as..."
- BearMark consistent across all pages
- Stage nav uses v2 pill pattern
- `npm run build` clean

---

## Phase 3 — PR 3: Image OCR Pipeline

**Branch:** `pr3/image-ocr-pipeline`

### 3.1 Image Content Reasoning (STATE.md PR 3)
- New: `webapp/server/services/imageOCR.ts`
- Claude vision API call for image documents (fallback: Tesseract for plain text)
- Extract text per image, store on `Document.extractedText` (new TEXT NULL column)
- Prisma migration: `add_document_extracted_text`
- `promptLoader.ts`: append extracted text from images alongside PDF text in Intake prompt
- Emit `finding` SSE event when image text contradicts case documents

### 3.2 Image Preview Enhancement
- `ImagePreviewModal.tsx`: add right-rail panel showing extracted text
- Remove `[AGENT BLIND]` badge once OCR is wired
- Show extraction confidence indicator

### Ship criteria
- Upload photo → run Intake → agent findings reference image content
- Modal right-rail shows extracted text
- No `[AGENT BLIND]` badge on OCR-processed images
- Migration applies clean

---

## Phase 4 — PR 4: Unified Capture Surface (Dannaway Pass)

**Branch:** `pr4/unified-capture-surface`
**This is the AD-led PR.** Full design system compliance pass.

### 4.1 Unified Capture (STATE.md PR 4)
- Refactor `CaseIntake.tsx` into single-column capture with three stacked cards: Documents / Notes / Photos
- Shared drag-drop target (route by MIME type)
- 8px rhythm strict, lucide icons, BearMark in empty states
- Forensic Noir palette (#FF6B35 accent sparing)
- Motion: card enter 180ms ease-out, no bounce
- Skeleton loaders on upload in flight
- Keyboard: Tab between cards, Space/Enter to open picker, Escape cancels

### 4.2 HITL Checkpoint as Command Center (Extraction UI items)
- `HumanCheckpointV2.tsx`: upgrade from simple modal to command-center treatment
- Surface synthesized data (agent findings count, QA score preview, document coverage %)
- Approve/Revise/Reject with clear visual hierarchy
- Modal uses `.v2-surface-elevated` with new radius scale per MIGRATION.md

### 4.3 QA Scorecard Presentation (Extraction UI items)
- `QADashboard.tsx` / `CheckResults.tsx` / `IssuesList.tsx`: apply v2 design tokens
- Score visualization: clear pass/marginal/fail thresholds (>85 = pass, 70-85 = marginal, <70 = fail)
- Issues list: severity badges with signal colors

### 4.4 AgentActivityFeedV2 Polish
- Finding events get `border-left: 2px var(--signal-amber)` per MIGRATION.md
- Progress events use subtle animation (not distracting)
- Complete events: BearMark micro-celebration (one-shot, not looping)

### 4.5 Design System Migration Cleanup
- Remove v1 components if v2 equivalents exist and are wired: `AgentActivityFeed.tsx` (v1), `HumanCheckpoint.tsx` (v1), `StageNav.tsx` (v1)
- Verify all remaining components use `tokens.css` variables, not hardcoded colors
- WCAG AA contrast check on all text elements
- `prefers-reduced-motion: reduce` honored in all animations

### Ship criteria
- Unified capture surface: drop PDF → file card, drop JPG → photo card, type note → note card
- Focus rings visible on all interactive elements
- All components use v2 design tokens
- v1 dead components removed
- `npm run build` clean, zero TS errors

---

## Phase 5 — Layer 2 Voice Conformance Integration

**Branch:** `pr5/voice-conformance`
**This is the AK-led PR.** The existential risk mitigation.

### 5.1 Wire Layer 2 Scripts into CI
The 5 scripts exist on Mac at `~/BLACK-BAR/scripts/`:
- `voice_check.sh` — orchestrator
- `voice_boilerplate_check.py` — Layer 2a: regex verification of 11 verbatim boilerplate blocks
- `voice_fingerprint.py` — Layer 2b: stylometric fingerprint (sentence length, passive voice %, formality score)
- `voice_judge.py` — Layer 2c: LLM judge (Claude call comparing draft against VOICE.md)
- `validate.sh` — general validation

### 5.2 PostToolUse Hook
`.claude/settings.local.json` already has a PostToolUse hook for `Cases/*/deliverables/`. Verify it triggers `voice_check.sh` on any file write to deliverables.

### 5.3 Golden Blessing Ceremony
This gates production. Walk through the 7-step sequence:

1. Ensure `Cases/` directory exists with golden case folders:
   - `Cases/carmona-gleason-2026/`
   - `Cases/young-heagy-2026/`
   - `Cases/carmona-anderson-2025/`
2. Place benchmark PDFs in each folder's `deliverables/` (from `benchmarks/` directory)
3. Run `voice_check.sh` against each benchmark
4. Baseline scores become the golden reference (stored in `tests/golden/`)
5. Clear `.voice-bless-pending` flag
6. Future drafts must score within threshold of golden baselines
7. Document thresholds in `tests/golden/README.md`

**[PRIVILEGED] Note:** Benchmark PDFs contain privileged case content. They must NEVER be committed to git. Only hashes and scores go into `tests/golden/`.

### 5.4 QA Agent Integration
- `agentRunner.ts`: after QA agent completes, automatically run Layer 2 voice check on the draft
- Append voice conformance score to QA scorecard
- If voice score falls below golden threshold, surface as a QA issue with `[VOICE GUARD]` flag

### Ship criteria
- `voice_check.sh` runs successfully against all 3 benchmarks
- Golden baselines stored (hashes + scores only, no privileged text)
- `.voice-bless-pending` cleared
- QA agent includes voice conformance in scorecard
- PostToolUse hook fires on deliverable writes

---

## Phase 6 — VOICE.md Amendments (from Extraction Report)

**Branch:** `pr6/voice-amendments`
**[VOICE GUARD] — requires Caleb approval before merge.**

The 24-extraction report identified 3 VOICE.md amendments. These are applied as a dedicated PR so the diff is reviewable:

### 6.1 Amendment 1 — [From extraction report]
Apply the specific voice directive changes identified in `docs/transcripts/architecture-discussion-extraction.md`. Each amendment must:
- Quote the source extraction number
- Show the exact diff (old text → new text)
- Note the source case/discussion

### 6.2 Amendment 2 — [From extraction report]
Same format.

### 6.3 Amendment 3 — [From extraction report]
Same format.

### Ship criteria
- VOICE.md changes are minimal and traceable to extraction source
- `voice_check.sh` re-run against golden baselines — scores should improve or hold
- Caleb reviews and approves before merge

---

## Phase 7 — PR 7: Railway Deploy + Production Cutover

**Branch:** `pr7/railway-production`
**Combines:** STATE.md PR 5 + final hardening

### 7.1 Railway Status (per STATE.md)
Already done:
- [x] GitHub repo connected as Railway service
- [x] Root directory `webapp`
- [x] Env vars set (DATABASE_URL, JWT_SECRET, seeds, ALLOWED_ORIGINS, ANTHROPIC_API_KEY, NODE_ENV)
- [x] Public domain generated
- [x] Node 22 pinned via `.nvmrc` + `package.json` engines
- [x] Migrations auto-applied via `railway.toml` startCommand
- [x] `DATABASE.md` runbook committed

### 7.2 Remaining deploy work
- [ ] Verify all new migrations (Note model, extractedText, user role enum) apply via `prisma migrate deploy`
- [ ] Smoke test on Railway preview: login → create case → upload doc → add note → upload photo → run all 4 agents → review QA → export PDF
- [ ] Verify SSE streaming works through Railway's proxy (may need `Connection: keep-alive` headers)
- [ ] Verify Puppeteer PDF export works in Railway's container (may need `--no-sandbox` flag)
- [ ] Set `ALLOWED_ORIGINS` to include production domain
- [ ] Remove construction-mode gate if present

### 7.3 Seed data verification
- Lane Swainston (`lane@swainstonconsulting.com`) — role: `expert`
- Mariz Arellano — role: `expert`
- Caleb Swainston — role: `admin`
- Verify seed script handles existing users gracefully (upsert, not insert)

### 7.4 Production smoke test
Full end-to-end on the production URL:
1. Login as Lane
2. Create case (slip_fall, initial report, Clark County jurisdiction)
3. Upload a test PDF
4. Add a note
5. Run Intake agent — verify SSE streaming, findings
6. Approve → Research agent
7. Approve → Drafting agent
8. Approve → QA agent
9. Review QA scorecard (voice conformance score visible)
10. Export as PDF — verify SCG branding, headers, footers
11. Export as DOCX — verify formatting

### Ship criteria
- Production URL serves the app
- Full pipeline runs end-to-end
- PDF and DOCX exports download correctly
- SSE streaming works through Railway proxy
- All migrations applied

---

## Phase 8 — Cleanup + Handoff

### 8.1 Update STATE.md
Rewrite to reflect "100% shipped" status. Remove the 5-PR punch list. Document what's live.

### 8.2 Update CLAUDE.md
Remove any stale references. Ensure all hard rules reflect current state.

### 8.3 Archive v1 references
Move root-level reference docs that are no longer active into `docs/archive/`:
- `ARCHITECTURE_AUDIT_v1.1.md`
- `BLACKBAR_FRONTEND_SPEC.md` (superseded by UI_SPEC_v3)
- `BLACKBAR_UI_SPEC_v2.md` (superseded by v3)
- `CLAUDE_CODE_HANDOFF.md`
- `DIRECTORY_MAP.md`
- `QUICKFIND.md`
- `SECURITY_HARDENING_PROMPT.md`
- `2026-03-26_agent-team-pressure-test.md`

### 8.4 Lane Handoff Document
Produce a 1-page "How to Use BlackBar" guide for Lane and Mariz:
- Login URL
- How to create a case
- How to upload documents and photos
- How to add notes
- How to run the pipeline (stage by stage)
- How to review QA scorecard
- How to export the final report
- Who to contact if something breaks

---

## Conflict Register (from 24-Extraction Report)

These 5 conflicts were identified during extraction analysis. Resolution is woven into the phases above:

| # | Conflict | Resolution | Phase |
|---|---|---|---|
| 1 | Missing EngagementAgreement in feed sequence | Not a schema model — engagement boundary is handled by ultraplan runbook, not DB | N/A |
| 2 | Suboptimal parallelization in feed sequence | Corrected: Phase A (Schema + VOICE.md parallel), Phase B (5 parallel workers), Phase C (ENTERPRISE_BRAIN.md) | All |
| 3 | Missing User role model | User.role already exists (default "operator") — add enum values in Phase 2 | 2 |
| 4 | Report typo #25 in extraction report | Corrected — 24 extractions, not 25 | N/A |
| 5 | Undocumented dependency chain | Documented in this plan's phase sequencing | All |

---

## Open Items (park until post-launch)

| # | Item | Status |
|---|---|---|
| 1 | Cloud storage migration (S3/GCS) | Post-launch. Local disk fine for single-instance Railway. |
| 2 | RBAC enforcement (role-based access control) | Post-launch. Data model ships in Phase 2, enforcement deferred. |
| 3 | Prowl (speculative execution) | Post-launch. Track acceptance rates first. Need 20+ real cases. |
| 4 | Code edition lookup automation | Post-launch. Lane confirms manually for now. |

---

## Hard Rules (from CLAUDE.md — enforced throughout)

- NEVER use `.tsx` file extension — all TypeScript files are `.ts` (React components use `.tsx` only in `webapp/src/`)
- NEVER use `prisma db push` in production — migrations required for ALL schema changes
- NEVER commit secrets, `.env`, or privileged case content
- Start command MUST end in `node dist/server/index.js`
- All new components: empty state, loading state, error state
- All interactive elements: visible focus ring + `aria-label` on icon-only buttons
- WCAG AA contrast minimum on all text
- `prefers-reduced-motion: reduce` respected
- `VOICE.md` is read-only during a case run
- Engagement isolation: case facts never enter tool repo

---

## PR Sequence Summary

| PR | Branch | What | Blocks |
|---|---|---|---|
| 0 | main (direct) | Repo hygiene — commit local artifacts | PR 1 |
| 1 | pr1/notes-first-class-capture | Notes + ultrareview fixes | PR 2 |
| 2 | pr2/image-preview-ui-polish | Image preview + extraction UI items | PR 3 |
| 3 | pr3/image-ocr-pipeline | Image OCR + agent vision | PR 4 |
| 4 | pr4/unified-capture-surface | Dannaway pass — full UI polish | PR 5 |
| 5 | pr5/voice-conformance | Layer 2 + golden blessing | PR 6 |
| 6 | pr6/voice-amendments | VOICE.md amendments [VOICE GUARD] | PR 7 |
| 7 | pr7/railway-production | Deploy + smoke test + handoff | — |

Each PR merges to main. Each is reversible. No long-lived branches.

---

## Quality Gate

| Check | Status |
|---|---|
| All 4 committee personas evaluated | PASS |
| STATE.md 5-PR sequence covered | PASS (mapped to PRs 1-4, 7) |
| 24-extraction report items covered | PASS (woven into PRs 2, 4, 5, 6) |
| Local-only artifacts addressed | PASS (Phase 0) |
| Layer 2 voice conformance sequenced | PASS (Phase 5) |
| Golden blessing ceremony sequenced | PASS (Phase 5.3) |
| Engagement isolation respected | PASS |
| No privileged content in plan | PASS |
| Conflicts resolved or documented | PASS (5/5) |
| Open items parked with rationale | PASS (4/4) |

---

*Swainston AI Committee v2.0 — PO + Karpathy + Boris + Dannaway*
*BlackBar v2.0 Sprint Plan — 2026-04-20*
