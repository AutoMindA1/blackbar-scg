# v1.0 MVP — E2E Smoke Test Checklist

**Branch:** `feat/dag-lane-gate-recovery`
**Goal:** Verify the role-tier + Pattern C pipeline works end-to-end before merging to `main` and triggering the Railway auto-deploy.

This checklist covers the path Mariz drives daily plus the deltas Lane sees as the signing expert. The full pipeline end-to-end requires a configured ANTHROPIC_API_KEY (already verified PR 0).

---

## Pre-flight

- [ ] On branch `feat/dag-lane-gate-recovery`
- [ ] `cd webapp && npm ci` (fresh node_modules)
- [ ] `cd webapp && npm run lint && npm run build && npm test` — all green
- [ ] Local `.env` has `ANTHROPIC_API_KEY` (rotated `YAWG…` per PR 0), `JWT_SECRET`, `DATABASE_URL`
- [ ] `cd webapp && npm run db:migrate:status` — "Database schema is up to date" (8 migrations)
- [ ] Production state spot-check via `prisma db execute` or psql — Lane row has `role='expert'` and `can_request_admin_view=true`; Mariz row has `role='expert'` and `can_request_admin_view=false`

---

## Local UAT — `npm run dev`

`cd webapp && npm run dev` (Vite on 5173, Express on 3001)

### A. Login as Mariz

- [ ] `mariz@swainston.com` / [SEED_MARIZ_PASSWORD] logs in
- [ ] Dashboard renders; sidebar shows `Mariz Arellano · expert`
- [ ] Sidebar does NOT show "Switch to admin view" toggle (Mariz lacks `canRequestAdminView`)

### B. Create a case + capture materials

- [ ] Click "+ New case" — case created
- [ ] Land on `/cases/:id/intake` — three stacked v2 cards (Documents / Photos / Notes)
- [ ] No `StageNavV2` visible (admin-only — Mariz tier)
- [ ] No `AgentActivityFeedV2` visible
- [ ] Header shows "Supervise closely" toggle (off by default)
- [ ] Upload a PDF → appears under Documents
- [ ] Upload a photo → appears under Photos with `BLIND` corner pill
- [ ] Add a note → appears under Notes

### C. Run Intake (Pattern C clean path)

- [ ] Click "Run Intake agent" → button enters running state
- [ ] Agent activity is NOT shown to Mariz (admin-only)
- [ ] When agent completes:
  - If T3 (`AGENT BLIND` content) fired because the photo wasn't OCR'd yet → `HumanCheckpointV2` opens with the T3 trigger pill + reason. Click "Approve & Continue" → navigates to `/cases/:id/research`.
  - If photo was OCR'd before run finished and no other triggers → toast appears top-right ("Intake complete · advancing to Research"), 4s later auto-navigates to `/cases/:id/research`.

### D. Auto-advance through Research → Lane Gate

- [ ] Click "Run Research agent"
- [ ] When it completes, `T6` (Lane Gate) fires unconditionally → modal opens with "Lane Gate" pill
- [ ] Modal shows attack-pattern findings; no per-finding confidence numerics for Mariz

### E. Switch to Lane perspective for the gate

This is the critical PR 6 path. Either log out + log in as Lane, OR keep Mariz logged in and accept that Lane signs separately later.

- [ ] Logout. Login as `lane@swainston.com` / [SEED_LANE_PASSWORD]
- [ ] Sidebar now shows "Switch to admin view" toggle
- [ ] Click the toggle → it flips to "Admin view ON" with signal-amber border
- [ ] StageNavV2, AgentActivityFeedV2, finding-confidence numerics now render on case pages (effective-admin)
- [ ] Verify audit log entry was written (admin can query `audit_log` table or check via Railway)
- [ ] Approve the Lane Gate modal → navigates to `/cases/:id/drafting`

### F. Drafting → QA → Sign & ship

- [ ] Click "Run Drafting agent"
- [ ] On completion, either auto_advance toast OR hitl_required modal (depending on Pattern C eval — drafting confidence + voice drift)
- [ ] Navigate to QA, click "Run QA agent"
- [ ] When QA completes with `score >= 70` and Lane is logged in → "Sign & ship" CTA card appears below the QADashboard
- [ ] Click "Sign & ship" → navigates to `/cases/:id/export`

### G. Export

- [ ] PDF download works
- [ ] DOCX download works

### H. Voice-guard lockdown spot-check

If you can fabricate a `voiceGuardActive` condition (or set `superviseClosely=true` on the case + manually trigger a T9):
- [ ] Modal renders only the "Dismiss" action with the ShieldAlert banner
- [ ] No Approve / Revise buttons visible

### I. Supervise closely toggle

- [ ] Login as Mariz, navigate to a case intake page, flip "Supervise closely" toggle ON
- [ ] Run an agent that would normally auto-advance
- [ ] T7 fires; modal opens (Pattern A behavior for this case)

---

## Production smoke test (post-merge)

After PR merge → Railway auto-deploys:
- [ ] `blackbar-scg-production.up.railway.app/api/health` returns `{"status":"ok", ...}`
- [ ] Login as Lane and Mariz both work on the production URL
- [ ] Create a small test case, run Intake, verify SSE events stream through Railway proxy (the X-Accel-Buffering header was set in earlier work — should still hold)
- [ ] Update STATE.md to flip PR 7 to ✅ shipped + production smoke pass.

---

## Known stumbling blocks

- **CaseForm.tsx:46 lint suppression** is intentional (CaseForm reset-on-prop pattern). Don't refactor during smoke; tracked separately.
- **AdminOverlay panel** is NOT yet a separate side panel. When Lane toggles admin view, the inline components surface (StageNav etc. render in the main case page chrome). PR 6.1 follow-up if Caleb wants the spec-literal side-panel UX after seeing this approach.
- **T10 (position-flip)** only fires when `caseState.positionFlipDetected === true`. No detector wires it today; the trigger plumbing is in place for future.
- **DATABASE_URL rotation** still pending per Path C from PR 0. Run via Railway CLI when convenient.
