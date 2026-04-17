# BlackBar Design System v2 — Forensic Noir × Dannaway Craft
**Status:** Active · **Adopted:** 2026-04-16 · **Owner:** Caleb Swainston

---

## What this is

The design system that governs every new BlackBar surface. Superseded by nothing yet; supersedes the legacy glassmorphism layer in `webapp/src/index.css`.

Two primary thinkers sit behind every decision:
- **Boris Cherny** — agentic systems, trust surfaces, thin bright interfaces over thick black boxes
- **Adham Dannaway** — design-dev bridge, craft floor, component-is-the-handoff

Operating rule: *every surface must be agent-honest AND craft-finished*. Neither pretty-but-mocked nor real-but-ugly ships.

---

## Where everything lives

| Artifact | Path | Purpose |
|---|---|---|
| Token spec | `Brand/DESIGN_TOKENS_v1.md` | Canonical color / type / space / motion / component patterns |
| Living reference | `Brand/UI_REFERENCE_v1.html` | Open in browser — renders 11 surfaces end-to-end |
| Implemented CSS | `webapp/src/styles/tokens.css` | Additive layer — imports alongside existing `index.css` |
| Migration map | `webapp/src/styles/MIGRATION.md` | v1 → v2 token-by-token guidance |
| Driving persona | `.claude/PERSONA_CHERNY_DANNAWAY.md` | System prompt — load into Claude Code as operating voice |
| State of the app | `STATE.md` | Current webapp state + 5-PR build sequence |

---

## How to use this with Claude Code

1. When opening a BlackBar Claude Code session, the root `CLAUDE.md` and `.claude/CLAUDE.md` both auto-load — they point at this system.
2. For any UI task, load the persona explicitly with `@.claude/PERSONA_CHERNY_DANNAWAY.md` in your first message, or paste its contents into a system prompt.
3. For any agent-pipeline task, reference `STATE.md` so Claude Code sees what's real vs stubbed.
4. Open `Brand/UI_REFERENCE_v1.html` in a browser before reviewing a PR — the reference shows what the surface *should* look like.

---

## The 5-PR rollout

Sequential. Each reversible. Full spec lives in `STATE.md`.

1. **Notes as first-class capture** — schema + route + `NoteList` + Intake agent integration.
2. **Image preview modal** — with mandatory `[AGENT BLIND]` pill.
3. **Image content reasoning** — OCR / Claude vision; removes `[AGENT BLIND]`.
4. **Unified capture surface** — full Dannaway pass on `CaseIntake`.
5. **Deploy to Railway** — preserve `node dist/server/index.js` start script.

---

## Non-negotiables

These are already in `.claude/CLAUDE.md` but repeated here for visibility:

- No glassmorphism / backdrop-filter as identity
- No gradients anywhere
- Inter Tight (not Inter) + Fraunces (optical-sized) + JetBrains Mono
- No pure `#000` / `#FFF`
- 8px rhythm strict
- Every surface: empty state, loading state, error state
- Every interactive element: visible focus ring
- Every icon-only button: `aria-label`
- `prefers-reduced-motion: reduce` respected
- Every agent-adjacent feature without reasoning: inline `[AGENT BLIND]` pill
- WCAG AA contrast minimum on all text

---

## Inline flag vocabulary

When Claude Code responds to BlackBar tasks, these flags appear in the prose *and* optionally render in the UI:

| Flag | Meaning |
|---|---|
| `[CHERNY LENS]` | System / agent reasoning block |
| `[DANNAWAY LENS]` | UI craft block |
| `[AGENT BLIND]` | Surface exists; agent doesn't reason over content yet |
| `[COMPLIANCE REVIEW]` | Touches regulated or citation-sensitive language |
| `[VOICE GUARD]` | Would edit Lane's voice in `VOICE.md` — approval required |
| `[BRAIN GUARD]` | Would edit `ENTERPRISE_BRAIN.md` — diff preview required |
| `[PRIVILEGED]` | Touches `Cases/` or `benchmarks/` |
| `[SCHEMA CHANGE]` | Touches `schema.prisma` — migration required |
| `[HARD RULE]` | Invokes a project hard rule |
| `[STALE DOC]` | Existing doc contradicts actual behavior |

---

## First migration targets

Read `webapp/src/styles/MIGRATION.md` for the full map. Quick version:

1. `BearMark.tsx` — make static, drop `bear-pulse` / `bear-glow` applications.
2. `StageNav` / `StageNavV2` — replace stage-specific hues with v2 pill state pattern.
3. `HumanCheckpointV2` — modal to `.v2-surface-elevated` with new radius scale.
4. `AgentActivityFeedV2` — finding events get `border-left: 2px var(--signal-amber)`.
5. `FileDropzone` → `UnifiedCaptureSurface` (combined with new `NoteList` + `PhotoList`).

---

## Version & ownership

- **v1.0** · 2026-04-16 · Caleb Swainston · adopted during `/ultraplan` pass
- Persona author: Cherny × Dannaway hybrid via `refijet-prompt-rubric` skill
- Reference implementation: `Brand/UI_REFERENCE_v1.html` is the source of truth. When the code diverges from the reference, the code is wrong.
