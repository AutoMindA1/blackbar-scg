# BlackBar — State of the Webapp
**Date:** 2026-04-24
**Status:** Phase 3 — ACTIVE LIVE TEST. Enterprise foundation deployed. DAG orchestrator + semantic router under construction.
**North Star:** Lane drops files, notes, photos → autonomous 4-stage pipeline → exports SCG-polished expert report. ✅

---

## Verdict

**BlackBar is deployed to production.** URL: `blackbar-scg-production.up.railway.app`

All four agent stages are real Anthropic API calls with typed JSON contracts, SSE streaming, chained previous-stage context, and human checkpoints. The v2 architecture (orchestrator, semantic routing, Lane Gate) is being built on top of the working v1 pipeline.

**Security posture:**
- SSO domain guard locks agent routes to `@swainston.com` emails only
- XSS sanitizer hardened against 9 OWASP evasion vectors
- Auth v2: 15-min access tokens, refresh token rotation, account lockout
- Audit trail on every API request

---

## Phase 3 Architecture Changes

| Change | Status | Notes |
|---|---|---|
| DAG Orchestrator | 🔨 BUILDING | CaseState JSON, phase transitions, confidence scoring |
| Semantic Router (Sonnet/Opus) | 🔨 BUILDING | Default Sonnet, upgrade to Opus on 3+ HIGH_COMPLEXITY flags |
| Lane Gate | 🔨 BUILDING | Manual approval required at Research→Drafting boundary |
| Domain Guard (@swainston.com) | 🔨 BUILDING | Middleware on all agent routes |
| RAG / Vector DB | ⏸️ DEFERRED | 37K token corpus fits in long-context injection. Revisit when corpus grows. |
| Adversarial QA (CoT) | ⏸️ DEFERRED | Will run on Sonnet first, upgrade to Opus when budget justifies |
| Write-Back Alignment | ⏸️ DEFERRED | Requires diff classification LLM call — Phase 5 |
| Prowl/Sentinel | 🔄 SUPERSEDED | Weighted scoring logic extracted into orchestrator. prowl.ts/sentinel.ts retired. |

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
| XSS sanitizer hardened | ✅ DONE | 9 OWASP bypass vectors patched |
| Enterprise schema | ✅ DONE | Organization, RefreshToken, AuditLog, UsageRecord, PromptVersion |
| Structured logging | ✅ DONE | JSON (prod), colored (dev), audit always writes |
| Auth v2 (refresh tokens) | ✅ DONE | 15-min access, rotation, reuse detection, lockout |
| Test suite | ✅ DONE | 341 tests, 15 files, vitest + v8 coverage |
| Usage metering | ✅ DONE | Per-org cost tracking, model pricing tiers |
| Job queue | ✅ DONE | In-process (dev), BullMQ-ready (prod with REDIS_URL) |
| Document text extraction | ✅ DONE | PDF/TXT/CSV content pipeline, 100K char limit |
| Multi-tenancy (schema) | ✅ DONE | Organization model, blast-door entity separation |
| Cloud storage (S3 / GCS) | ❌ NOT YET | Local disk — fine for v1 single-instance |
| Golden Blessing ceremony | ⏳ PENDING | Requires Cases/ benchmark PDFs (privileged, local only) |
| VOICE.md Phase 6 amendments | ⏳ PENDING | [VOICE GUARD] — awaiting Caleb approval |

---

## Architecture

- **Frontend:** React 19 + TypeScript 5.9 + Vite 8 + Tailwind CSS 4 + Zustand 5 + TanStack Query 5
- **Backend:** Express 5 + Prisma 6.19 (PostgreSQL on Railway) + Anthropic SDK 0.82
- **Auth:** bcrypt + JWT (v1) / Refresh token rotation (v2) / Domain guard (@swainston.com)
- **Deploy:** Railway — auto-rebuild on push to main, migrations at container start
- **Agents:** 4-stage pipeline (Intake → Research → Drafting → QA), real Anthropic API, SSE streaming, typed JSON contracts, chained context
- **Orchestrator (v2):** DAG with CaseState JSON, confidence-gated transitions, Lane Gate at Research→Drafting, Sonnet/Opus semantic routing
- **Voice QA:** Layer 2 `scripts/voice_check.sh` runs deterministic §11/§21 checks after QA agent, result appended to scorecard
- **Observability:** Structured JSON logger, request-level audit trail, per-org usage metering
- **Testing:** 341 tests (vitest), 0 lint errors, tsc clean
