# v1 → v2 Token Migration Map

**From:** legacy `index.css` tokens (glassmorphism era)
**To:** `tokens.css` v2 — Forensic Noir × Dannaway Craft
**Strategy:** additive, per-component migration. Do NOT bulk-replace. Migrate one component per PR, verify, ship.

---

## Color token map

| v1 (legacy, `index.css`) | v2 (`tokens.css`) | Notes |
|---|---|---|
| `--color-bg-primary` `#0A0A0F` | `--noir-0` `#0B0D10` | Canvas — 1pt lighter for less crushed blacks |
| `--color-bg-secondary` `#12121A` | `--noir-1` `#14171C` | Card surface — warmer |
| `--color-bg-elevated` `#1A1A25` | `--noir-2` `#1C2028` | Hover / modal — warmer |
| `--color-bg-glass` (rgba) | **RETIRED** | No glassmorphism as identity |
| `--color-accent-primary` `#FF6B35` | `--signal-amber` `#FF6B35` | **Same** — brand accent preserved |
| `--color-accent-hover` `#FF8355` | — | v2 uses `translateY(-1px)` + shadow, not color shift |
| `--color-accent-glow` | `--signal-amber-soft` `0.12 opacity` | Same purpose, cleaner name |
| `--color-accent-secondary` `#D4A853` | **RETIRED** | Verdict-amber only — no gold accent |
| `--color-accent-brass` `#C4973B` | **RETIRED** | Same reason |
| `--color-text-primary` `#F5F5F7` | `--bone` `#ECE9E2` | Warmer off-white — less clinical |
| `--color-text-secondary` `#B8B8C0` | `--bone-muted` `#A8A59C` | Warmer |
| `--color-text-muted` `#6B6B78` | `--bone-dim` `#6B685F` | Warmer |
| `--color-success` `#34D399` | `--verdict-green` `#4F9D69` | Deeper, less neon |
| `--color-warning` `#FBBF24` | `--verdict-amber` `#D9A441` | Deeper |
| `--color-error` `#F87171` | `--verdict-red` `#C1462B` | Deeper, more forensic |
| `--color-info` `#60A5FA` | **RETIRED** | v2 palette is monochrome+amber. Info collapses into neutral text. |
| `--color-stage-intake` `#60A5FA` | **RETIRED** | No stage-specific hues |
| `--color-stage-research` `#A78BFA` | **RETIRED** | ″ |
| `--color-stage-drafting` `#FF6B35` | **RETIRED** | ″ |
| `--color-stage-qa` `#FBBF24` | **RETIRED** | ″ |
| `--color-stage-export` `#34D399` | **RETIRED** | Stage identity communicated by position + pill status |

## Typography map

| v1 | v2 | Notes |
|---|---|---|
| `--font-body: 'DM Sans'` | `--font-ui-v2: 'Inter Tight'` | Tighter, more engineered. Swap Google Fonts import. |
| `--font-display: 'Fraunces'` | `--font-display-v2: 'Fraunces'` | **Same** — already the right call |
| `--font-mono: 'JetBrains Mono'` | `--font-mono-v2: 'JetBrains Mono'` | **Same** |
| `--font-report: 'Times New Roman'` | — | Unchanged for export rendering |

## Utilities to retire

| v1 utility | v2 replacement |
|---|---|
| `.glass` | `.v2-surface` |
| `.glass-elevated` | `.v2-surface-elevated` |
| `.glow-border` | border `var(--signal-amber-border)` + optional `shadow-md` |
| `.brass-border` | **RETIRED** — no brass |
| `.pulse-accent` keyframes | stage pill pulse only (see `v2-pill-running` dot) |
| `.bear-pulse` / `.bear-glow` | Bear mark is static; motion is conveyed by the pill, not the mark |
| `.card-hover` | `.v2-surface` with built-in hover transition |

## Migration order (suggested — one component per PR)

1. `BearMark.tsx` — swap to static. Remove `bear-pulse` / `bear-glow` applications.
2. `StageNav` / `StageNavV2` — replace stage-color tokens with pill state pattern from v2.
3. `HumanCheckpointV2` — modal adopts `.v2-surface-elevated` + new radius scale.
4. `AgentActivityFeedV2` — event row adopts `border-left: 2px var(--signal-amber)` on finding events.
5. `FileDropzone` — redesign as unified capture surface (combined with new NoteList + PhotoList).
6. New components (NoteList, ImagePreviewModal) — v2-native from first commit.
7. Page-level cleanup — retire `.glass*`, `.brass-border`, `.bear-pulse` usage.
8. Final pass — delete retired tokens from `index.css`.

## Import order

In `main.tsx` or `App.tsx` entry:

```ts
import './index.css';            // v1 — keep until step 8
import './styles/tokens.css';    // v2 — additive, safe to ship now
```

The v2 layer is non-breaking. You can import it today and start using `.v2-*` utilities in new components without touching v1 consumers.

## Don'ts during migration

- Do NOT run a bulk find-replace across the codebase — it will break typography in subtle ways (DM Sans ≠ Inter Tight metrics).
- Do NOT ship a component that mixes v1 glass + v2 surface — pick one per component.
- Do NOT remove `--color-bg-primary` etc. from `index.css` until every consumer is migrated.
- Do NOT skip the `@media (prefers-reduced-motion)` block on any new motion.
