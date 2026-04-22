# BlackBar — State of the Webapp
**Date:** 2026-04-20
**Status:** Sprint complete — all feature PRs open against main, awaiting merge and Railway smoke test.
**North Star:** Lane drops files, notes, photos → runs 4-stage pipeline → exports SCG-polished expert report. ✅

---

## Verdict

**BlackBar is production-ready pending PR merges and Railway smoke test.**

All four agent stages are real Anthropic API calls with typed JSON contracts, SSE streaming, chained previous-stage context, and human checkpoints. Intake OCR (Claude vision) removes `[AGENT BLIND]` from photos automatically. Layer 2 voice conformance runs in the QA stage. PDF/DOCX export is live.

---

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| File upload (PDF / DOCX / CSV / image) | ✅ DONE | Multer disk, 10×25MB, whitelist, page count |
| Notes / annotations | ✅ DONE | Note model, CRUD routes, NoteList component |
| Image preview modal | ✅ DONE | Keyboard nav, Escape close, right-rail OCR text |
| Image content reasoning (Claude vision OCR) | ✅ DONE | extractedText column, haiku vision, [AGENT BLIND] cleared |
| Unified capture surface | ✅ DONE | Three stacked v2 cards: Documents / Photos / Notes |
| Intake agent | ✅ DONE | Typed IntakeResult, flags, missing fields, OCR integration |
| Research agent | ✅ DONE | Attack patterns, code refs, source tracking |
| Drafting agent | ✅ DONE | Section list, word count, voice score |
| QA agent | ✅ DONE | 0-100 score, check results, issues list |
| Layer 2 voice conformance in QA | ✅ DONE | §11/§21 checks, scorecard check appended |
| Chained previous-stage context | ✅ DONE | `getPreviousStageOutput()` in agentRunner |
| Human checkpoint (approve/revise/reject) | ✅ DONE | HumanCheckpointV2 command center with stats row |
| SSE streaming agent events | ✅ DONE | progress/finding/complete/error + X-Accel-Buffering |
| Draft editor (contenteditable) | ✅ DONE | Save → Report.content versioned |
| PDF export | ✅ DONE | Puppeteer, SCG headers/footers, --no-sandbox |
| DOCX export | ✅ DONE | html-to-docx, 12pt Times, 1in margins |
| HTML export | ✅ DONE | Client-side download |
| Design System v2 tokens | ✅ DONE | signal-amber, noir-1/2/3, v2-surface classes throughout |
| UserRole enum | ✅ DONE | operator / expert / admin; Lane + Mariz = expert |
| Dead v1 components removed | ✅ DONE | AgentActivityFeed, HumanCheckpoint, StageNav deleted |
| Cloud storage (S3 / GCS) | ❌ NOT YET | Local disk — fine for v1 single-instance |
| Golden Blessing ceremony | ⏳ PENDING | Requires Cases/ benchmark PDFs (privileged, local only) |
| VOICE.md Phase 6 amendments | ⏳ PENDING | [VOICE GUARD] — awaiting Caleb approval |

---

## PR Queue

| PR | Branch | Title | Status |
|---|---|---|---|
| #5 | pr1/notes-first-class-capture | Notes as first-class capture | ✅ Merged |
| #6 | pr3/image-ocr-pipeline | Image OCR pipeline | Open |
| #7 | pr4/unified-capture-surface | Unified capture surface (Dannaway pass) | Open |
| #8 | pr5/voice-conformance | Layer 2 voice conformance in QA | Open |
| #9 | pr7/railway-production | Railway production hardening | Open |
| — | pr6/voice-amendments | VOICE.md amendments | [VOICE GUARD] blocked |

---

## Pending Manual Steps (post-merge)

1. **Migration drift fix:** `prisma migrate resolve --applied 20260417190000_add_agent_log_feedback` against Railway DB — see DATABASE.md
2. **ALLOWED_ORIGINS:** Verify production domain is included in Railway env var
3. **Golden Blessing:** Stage `Cases/*/expected/` benchmark PDFs and run `/ultraplan voice-bless` sequence — see `tests/golden/README.md`
4. **VOICE.md Phase 6:** Review extraction report amendments, approve PR
5. **Production smoke test:** Full end-to-end on Railway URL (login → upload → pipeline → export)

---

## Architecture

- **Frontend:** React 19 + TypeScript 5.9 + Vite 8 + Tailwind CSS 4 + Zustand 5 + TanStack Query 5
- **Backend:** Express 5 + Prisma 6.19 (PostgreSQL on Railway) + Anthropic SDK 0.82
- **Auth:** bcrypt + JWT
- **Deploy:** Railway — `buildCommand`: `npm install && npx prisma generate && npm run build`; `startCommand`: `npx prisma migrate deploy && node dist/server/index.js`
- **Agents:** 4-stage pipeline (Intake → Research → Drafting → QA), real Anthropic API, SSE streaming, typed JSON contracts, chained context
- **Voice QA:** Layer 2 `scripts/voice_check.sh` runs deterministic §11/§21 checks after QA agent, result appended to scorecard
