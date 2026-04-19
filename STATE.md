# BlackBar — State of the Webapp (Ultraplan)
**Date:** 2026-04-16
**Frame:** Capture → Pipeline → Polish
**Lens:** Boris Cherny (agentic systems) × Adham Dannaway (design-dev bridge)

---

## Verdict

**BlackBar is 70% shipped. The pipeline is real, the export is real, the intake UX is the bottleneck.**

Caleb's `.claude/CLAUDE.md` still says "4 agents (mocked SSE)" — that's stale. The agents are real Anthropic calls with typed JSON contracts, SSE streaming, feedback loops, and chained previous-stage context. PDF and DOCX export run through Puppeteer + html-to-docx and produce binary blobs with SCG branding.

The gap between where BlackBar is and where it needs to be is entirely in the **Capture** zone — intake as a unified surface for files + notes + photos — plus one small UX debt (stubbed image preview) and one documentation debt (stale CLAUDE.md note on agents).

---

## State Punch List

| Feature | Status | Notes |
|---|---|---|
| File upload (PDF / DOCX / CSV / image) | ✅ DONE | Multer disk, 10×25MB, whitelist, page count via pdf-parse |
| Document catalog → Intake agent | ✅ DONE | Typed IntakeResult, flags, missing fields |
| Research agent | ✅ DONE | Attack patterns, code refs, source tracking |
| Drafting agent | ✅ DONE | Section list, word count, voice score |
| QA agent | ✅ DONE | 0-100 score, check results, issues list |
| Chained previous-stage context | ✅ DONE | `getPreviousStageOutput()` |
| Human checkpoint (approve/revise/reject) | ✅ DONE | HumanCheckpointV2 modal, stage transitions |
| SSE streaming agent events | ✅ DONE | progress/finding/complete/error |
| Draft editor (contenteditable) | ✅ DONE | Save → Report.content versioned |
| PDF export | ✅ DONE | Puppeteer, SCG headers/footers |
| DOCX export | ✅ DONE | html-to-docx, 12pt Times, 1in margins |
| HTML export | ✅ DONE | Client-side |
| **Notes / annotations** | ❌ MISSING | No Note model, no API, no UI |
| **Image preview modal** | 🟡 STUBBED | Upload works, Eye icon is no-op |
| **Unified capture surface** | 🟡 FRAGMENTED | FileDropzone exists; notes and photos not co-located |
| **Image content reasoning (OCR / vision)** | ❌ MISSING | Images are [AGENT BLIND] |
| Cloud storage (S3 / GCS) | ❌ MISSING | Local disk only — fine for v1, blocks multi-instance deploy |
| Railway deployment | ❌ PENDING | Postgres online, webapp not deployed |
| Stale "mocked SSE" doc | 🟡 DOCBUG | `.claude/CLAUDE.md` incorrect |

---

## The Real Ask

> "We need to be able to add files, notes, pictures, etc. in the front end and out the back-end of BlackBar comes finished SCG-Polished Initial Reports."

Translating: intake should be a **single choreographed capture surface** where Lane drops a PDF, types a note, attaches a crime-scene photo, and the Intake agent reasons over all three as first-class inputs. Output is already polished (PDF/DOCX/HTML via Puppeteer). The work is entirely upstream.

---

## Build Sequence — 5 PRs, each reversible

### PR 1 — Notes as first-class capture
**Zone:** Capture
**Hard rules touched:** `[SCHEMA CHANGE]`
**Agent-honesty risk:** Medium — notes must flow into Intake agent, not just sit in DB

1. `npx prisma migrate dev --name add-note-model` — Note: `id, caseId, body, createdAt, updatedAt`, index on caseId.
2. `webapp/server/routes/notes.ts` — POST / GET / PUT / DELETE. Zod. Rate limit matches documents.
3. `webapp/src/components/shared/NoteList.tsx` — inline card stack. 60-char preview. Click to expand. Empty state one-liner.
4. Mount `NoteList` in `CaseIntake.tsx` beneath `FileDropzone`, same column, shared heading "Case Materials."
5. `webapp/server/services/promptLoader.ts` — `getNotesContext(caseId)` injected into Intake user prompt.
6. Extend `IntakeResult` type: `noteCount`, `noteContext`. Agent surfaces note↔document contradictions as `finding` event.
7. Fix stale `.claude/CLAUDE.md` line ("4 agents (mocked SSE)" → "4 agents, real Anthropic SDK calls with typed JSON contracts").

**Ship criteria:** Lane can type a note, see it listed, delete it, and on Intake run the agent's findings reference note content.

---

### PR 2 — Image preview modal (non-agentic, flagged)
**Zone:** Polish
**Hard rules touched:** none
**Agent-honesty risk:** High if shipped without the flag — users assume agent processed the image

1. `webapp/src/components/shared/ImagePreviewModal.tsx` — blurred backdrop, 24px radius, keyboard arrow nav between case photos, Escape close, ~180ms ease-out open.
2. Wire Eye icon in `FileDropzone` to open modal for image types only.
3. Inline badge on modal: `[AGENT BLIND]` — "Human review only. Agent does not read image content yet."
4. No backend changes.

**Ship criteria:** Click eye → modal opens → arrow keys navigate → Escape closes. Badge visible.

---

### PR 3 — Image content reasoning (removes the [AGENT BLIND] flag)
**Zone:** Pipeline
**Hard rules touched:** none
**Agent-honesty risk:** Low once shipped

1. `webapp/server/services/imageOCR.ts` — Claude vision (or Tesseract for plain text), extract text per image, cache on Document.
2. Extend `Document` model with `extractedText` (TEXT NULL). Migration: `add-document-extracted-text`.
3. Intake agent prompt loader: append extracted text from images alongside PDF text.
4. ImagePreviewModal: add right-rail panel showing extracted text. Remove `[AGENT BLIND]` badge.
5. Emit `finding` event when image text contradicts case documents.

**Ship criteria:** Upload photo → Intake run → finding references image content → modal right-rail shows extracted text.

---

### PR 4 — Unified Capture surface (Dannaway pass)
**Zone:** Capture / Polish
**Hard rules touched:** none
**Agent-honesty risk:** none

1. Refactor `CaseIntake.tsx` into single-column capture with three stacked cards: Documents / Notes / Photos.
2. Shared drag-drop target (drops route by MIME type).
3. 8px rhythm, lucide icons, BearMark in empty states, Forensic Noir palette (#FF6B35 accent sparing).
4. Motion: card enter 180ms ease-out, no bounce. Skeleton loaders on upload in flight.
5. Keyboard: Tab between cards, Space/Enter to open file picker, Escape cancels modal.

**Ship criteria:** Drop a PDF → file card. Drop a JPG → photo card. Type note → note card. All three in one surface. Focus ring visible.

---

### PR 5 — Deploy to Railway
**Zone:** Cross-cutting
**Hard rules touched:** `[HARD RULE]` start script ends in `node dist/server/index.js`
**Agent-honesty risk:** none
**Status:** Largely done as of 2026-04-19. Site is live at `blackbar-scg-production.up.railway.app` in construction mode. Deploy-hardening PR (see below) resolved the Node-version build failure and tracked-migrations gap.

- [x] GitHub repo connected as Railway service
- [x] Root directory `webapp`
- [x] Env vars set: `DATABASE_URL` (internal), `JWT_SECRET`, `SEED_LANE_PASSWORD`, `SEED_MARIZ_PASSWORD`, `ALLOWED_ORIGINS`, `ANTHROPIC_API_KEY`, `NODE_ENV=production`
- [x] Public domain generated
- [x] Node 22 pinned via `.nvmrc` + `package.json` engines
- [x] Migrations tracked in git and auto-applied via `railway.toml` startCommand (`prisma migrate deploy &&`)
- [x] `DATABASE.md` runbook committed
- [ ] Smoke test: login → create case → upload doc → run Intake → export PDF (run after deploy-hardening merges)

**Ship criteria:** Public URL, login works on `lane@swainstonconsulting.com`, full pipeline runs on deployed instance, PDF downloads.

---

## Open Questions (non-blocking, park until PR 1 lands)

1. **Cloud storage migration (S3/GCS):** local disk fine for single-instance Railway. Required the moment we go multi-instance or need cross-device photo access. Worth spiking in parallel to PR 3.
2. **Voice model for photos:** if photo captures scene context, should extracted text be written in Lane's voice downstream in Drafting, or kept raw in Research? Recommend raw in Research, voice-transformed in Drafting.
3. **Prowl (speculative execution):** stays dormant until 20+ real cases. Track acceptance rate from PR 1 onward so the data exists when we want to turn it on.

---

## Stale Docs to Fix (one-liner each)

- [x] `/BLACK-BAR/.claude/CLAUDE.md` — "(mocked SSE)" note on 4 agents removed.
- [x] `/BLACK-BAR/CLAUDE.md` — deploy workflow rewritten, hard rules clarified, `DATABASE.md` pointer added (deploy-hardening PR).
- [x] `STATE.md` at project root — this file.

---

## Summary

The back end is cooked. The export is cooked. The agents are real. What's missing is a proper **capture surface** — notes (missing), image preview (stubbed), unified intake (fragmented) — plus one deploy. Five reversible PRs close the loop. Ship in order; none depends on the one after.
