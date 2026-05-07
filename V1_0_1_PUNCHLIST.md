# v1.0.1 Punchlist

Items deferred from v1.0 MVP smoke per `/ship-v1` hybrid posture: blockers inline, polish to fast-follow.

Format: `[severity] item — context`

## Upload UX
- [polish] Inline error surface in `FileDropzone` when an upload partially fails — current `handleFiles` swallows server errors silently in `setUploading(false)` finally; user sees no signal that some files were rejected (size > 200MB, MIME mismatch, etc.). Add a per-file failure list in the dropzone footer.
- [polish] Per-file size hint in dropzone copy — e.g. "PDFs up to 200MB · 50 docs per case." Sets expectation before the user wastes a drag.
- [polish] Upload progress bar for large drops (multi-PDF deposition bundles). Currently just a spinner.

## Admin view
- [polish] Build `AdminOverlay` right-docked collapsible panel per `ADMIN-PANEL-SPEC.md` §Lane's expert-toggle. v1.0 ships with inline role-gating; AdminOverlay isolates Mariz chrome from admin internals more cleanly.
- [polish] Full `/admin/*` pages from `ADMIN-PANEL-SPEC.md` (`/admin`, `/admin/cases/:id/pipeline`, `/admin/cases/:id/orchestrator`, `/admin/users`, `/admin/agents`, `/admin/audit`, `/admin/cases/:id/voice-check`). Not enumerated in `/ship-v1`'s PR list — v1.1 scope.

## Pattern C
- [calibration] Tune Pattern C thresholds (`intakeConfidenceThreshold` 0.7 / `researchConfidenceThreshold` 0.7 / `draftingConfidenceThreshold` 0.65 / `qaPassThreshold` 70 / `voiceDriftThreshold` 0.15) against the first 5 real cases per `HITL-PATTERN-C-SPEC.md` §Open items.
- [feature] T10 position-flip-on-pressure detector — currently a stub in `orchestrator.ts:581` that fires only when an external flag is set. Real detector needs Myers-case calibration data first.

## Subagent infrastructure
- [followup] Re-run playbook-extractor subagent to land `CLAUDE_CODE_PLAYBOOK_v1.md` at `/Users/calebswainston/SCG/playbooks/`. Both prior runs blocked at harness-level Write permission. Either pre-approve writes to that path or write from main thread with engagement-isolation discipline.

## Tests
- [coverage] Add e2e test for client-side upload chunking (≥50 files in one drop should batch correctly).

## Deferred from `/ship-v1` itself
- v1.0 stop conditions remaining: Layer 2 voice conformance result inspection on first real Drafting output, golden-baseline drift tracking persistence.
