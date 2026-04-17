# BlackBar Design System — Forensic Noir × Dannaway Craft
**v1.0 — 2026-04-16**
**Owner:** Caleb Swainston · **User:** Lane Swainston · **Brand:** Swainston Consulting Group (SCG)

---

## Design Identity (one paragraph)

BlackBar is a forensic instrument, not a SaaS dashboard. Deep near-black surfaces carry bone-white type. Amber signal is used like a scalpel — never decoration. Typography pairs Fraunces (display, optical-sizing) with Inter Tight (engineered UI sans). No gradients. Shadow and spacing do the boundary work. Motion is 180ms ease-out — deliberate, no bounces. The Bear mark is a signal, surfacing in empty and loading states. Every agent surface is agent-honest: token counts, findings, confidence, and `[AGENT BLIND]` flags visible by default.

---

## Color — HSL-based semantic tokens

| Token | Value | Use |
|---|---|---|
| `--noir-0` | `hsl(215 18% 6%)` / `#0B0D10` | Page canvas |
| `--noir-1` | `hsl(218 15% 9%)` / `#14171C` | Card surface |
| `--noir-2` | `hsl(219 15% 14%)` / `#1C2028` | Elevated surface (hover, modal) |
| `--noir-3` | `hsl(220 14% 19%)` / `#272C36` | Border / divider |
| `--signal-amber` | `hsl(16 100% 60%)` / `#FF6B35` | Primary accent, CTA, live state |
| `--signal-amber-soft` | `hsl(16 100% 60% / 0.12)` | Accent tint, focus ring base |
| `--bone` | `hsl(42 18% 90%)` / `#ECE9E2` | Primary text |
| `--bone-muted` | `hsl(42 8% 63%)` / `#A8A59C` | Secondary text, metadata |
| `--bone-dim` | `hsl(42 5% 40%)` / `#6B685F` | Tertiary, placeholder |
| `--verdict-green` | `hsl(142 32% 46%)` / `#4F9D69` | Approved, passing |
| `--verdict-amber` | `hsl(40 68% 55%)` / `#D9A441` | Warning, revision |
| `--verdict-red` | `hsl(12 65% 46%)` / `#C1462B` | Rejected, failed, blocking |

**Rules:**
- No pure black (`#000`), no pure white (`#FFF`)
- Interactive states: hover +5% L, active −5% L, disabled 40% opacity
- Amber is used on: primary buttons, live agent state, focus rings, one icon accent per surface max
- Body contrast minimum 4.5:1 on `--noir-1`. UI contrast 3:1 minimum.

---

## Typography

| Token | Family | Use |
|---|---|---|
| `--font-display` | `"Fraunces", "Iowan Old Style", Georgia, serif` | Headlines, case titles, report sections. Optical sizing on. |
| `--font-ui` | `"Inter Tight", "Inter", system-ui, sans-serif` | All UI, body, labels, buttons |
| `--font-mono` | `"JetBrains Mono", ui-monospace, monospace` | JSON, timestamps, token counts, code |

**Type scale (fluid, clamp-based):**

```css
--fs-display: clamp(2.25rem, 4vw, 3.5rem);   /* hero, page title */
--fs-h1:      clamp(1.75rem, 2.5vw, 2.25rem);/* section lead */
--fs-h2:      1.375rem;                      /* subsection */
--fs-h3:      1.125rem;                      /* card title */
--fs-body:    0.9375rem;                     /* 15px body */
--fs-small:   0.8125rem;                     /* 13px meta */
--fs-micro:   0.6875rem;                     /* 11px micro-label, uppercase */
```

**Weights:**
- Display: 500 / 600 (never 700+ — stays literary, not shouty)
- UI: 400 (body) / 500 (emphasis) / 600 (button, heading)
- Mono: 400

**Line-height:**
- Display: 1.1
- Headings: 1.2
- Body: 1.55
- Micro / mono: 1.4

**Tracking:**
- Display: `-0.02em`
- UI headings: `-0.01em`
- Micro / uppercase labels: `+0.08em`

---

## Spacing — 4 base, 8px rhythm

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  24px
--space-6:  32px
--space-7:  48px
--space-8:  64px
--space-9:  96px
```

Sections use `--space-7` or `--space-8` vertical. Cards pad `--space-5`. Stack rhythm defaults to `--space-3`.

---

## Radii, shadow, border

```
--radius-sm: 6px   (chips, badges)
--radius-md: 10px  (buttons, inputs)
--radius-lg: 14px  (cards)
--radius-xl: 20px  (modals, major surfaces)

--shadow-sm: 0 1px 0 rgb(0 0 0 / 0.5)                               /* card */
--shadow-md: 0 8px 24px -8px rgb(0 0 0 / 0.6)                       /* hover, popover */
--shadow-lg: 0 24px 48px -16px rgb(0 0 0 / 0.7)                     /* modal */
--shadow-focus: 0 0 0 3px hsl(16 100% 60% / 0.4)                    /* focus ring */

--border-hairline: 1px solid var(--noir-3)
```

Prefer shadow + spacing to borders. A border appears only when the surface needs a strict edge (inputs, dividers, table rows).

---

## Motion

```
--duration-fast: 120ms
--duration-base: 180ms
--duration-slow: 280ms

--ease-forensic: cubic-bezier(0.2, 0, 0, 1)   /* default */
--ease-spring: cubic-bezier(0.34, 1.28, 0.64, 1) /* interactive press only */
```

**Rules:**
- Default all transitions to `--duration-base --ease-forensic`
- No bounce except on button press / drag drop
- Stagger content reveals by 40ms
- Always respect `prefers-reduced-motion: reduce`

---

## Components — canonical patterns

### Button — primary
- Bg `--signal-amber`, text `--noir-0`, weight 600, letter-spacing `-0.005em`
- Padding `10px 16px`, radius `--radius-md`
- Hover: lift 1px, shadow-md
- Active: lift 0, brightness 0.95
- Focus: `--shadow-focus`

### Button — ghost
- Bg transparent, border hairline, text `--bone`
- Hover: bg `--noir-2`, border `--bone-muted`

### Pill — stage status
- Height 24px, padding `0 10px`, radius 12px, font-mono micro, uppercase
- States: `pending` (bone-dim bg), `running` (amber soft bg + pulsing 2px amber dot), `complete` (verdict-green soft bg), `failed` (verdict-red soft bg)

### Card — capture material (file / note / photo)
- Bg `--noir-1`, border `--border-hairline`, radius `--radius-lg`, padding `--space-5`
- Left icon (24px) color-keyed by material type (doc=bone, note=amber, photo=green)
- Focus-within: border `--signal-amber`, shadow-focus

### Score ring — QA
- SVG, 96px, stroke-width 6, rounded caps
- Track color `--noir-3`, progress `--signal-amber` until 70+, then `--verdict-green`
- Numeric in Fraunces display weight 600 centered

### Agent activity event
- 3-col grid: `[timestamp mono] [icon] [message]`
- `finding` events render with inline amber left-border 2px
- `[AGENT BLIND]` flag renders as pill right-aligned amber-soft

### Bear mark
- Inline SVG, 24×24 or 48×48 or 96×96 (empty state)
- Stroke weight stays 1.5px regardless of size
- Never rotated, never mirrored, never colored amber

---

## Inline flags — visual language

Flags live in the UI, not just the prompt. They render as pills:

| Flag | Bg | Border | Text | When visible |
|---|---|---|---|---|
| `[AGENT BLIND]` | `--signal-amber-soft` | amber | amber | Surface exists, agent doesn't reason over it yet |
| `[COMPLIANCE REVIEW]` | `--verdict-amber` soft | amber | amber | Output touches regulated language |
| `[PRIVILEGED]` | `--noir-2` | bone-dim | bone-muted | Touches Cases/ or benchmarks/ |
| `[VOICE GUARD]` | `--noir-2` | verdict-red | verdict-red | Would edit VOICE.md tone |
| `[LIVE]` | `--signal-amber-soft` | amber with pulse | amber | Agent currently streaming |

---

## Accessibility floor (non-negotiable)

- WCAG AA contrast on all text
- Every interactive element has a visible focus ring
- Every icon-only button has `aria-label`
- Modals trap focus and restore on close
- Stage nav is keyboard-navigable (Tab + Enter)
- Drag-drop alternatives present (button to open file picker)
- Reduced motion pref respected

---

## Don'ts

- No Inter as default sans — use Inter Tight
- No gradient anywhere (no background, no button, no chart)
- No glassmorphism / backdrop-filter as identity
- No purple, violet, or indigo — this is not a SaaS
- No icon-only buttons without aria-label
- No animation that doesn't communicate state
- No full #000 or #FFF
- No screen without an empty state, a loading state, and an error state

---

## Next-step mapping to the 5-PR build

| PR | Design system surface touched |
|---|---|
| PR 1 — Notes as first-class | Note card pattern, unified capture heading, `[AGENT BLIND]` pill |
| PR 2 — Image preview modal | Modal radii, Bear loading state, `[AGENT BLIND]` flag |
| PR 3 — Image content reasoning | Remove `[AGENT BLIND]`, extracted-text side panel |
| PR 4 — Unified capture surface | The full capture pattern — stacked cards, shared heading, single drop target |
| PR 5 — Deploy | No new surfaces; verify dark canvas renders correctly on Railway domain |

Every PR ships a component that respects every token above. No magic numbers.
