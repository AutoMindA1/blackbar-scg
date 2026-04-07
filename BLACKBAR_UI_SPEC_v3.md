# BlackBar v3.0 — Lemonade-Style Enterprise UI Specification
## "Savage Wins" Design System + Hero Bear Integration + Screen-by-Screen Spec
## For Claude Code Execution | Target: Monday Demo with Lane & Mariz

---

## DESIGN PHILOSOPHY

**Inspiration:** Lemonade Insurance — conversational, progressive disclosure, one-action-at-a-time, glossy animations, approachable enterprise.

**BlackBar Translation:** Forensic noir meets modern enterprise. Dark canvas (not black — deep charcoal), brass/orange accent (#FF6B35), glass morphism panels, purposeful micro-animations. The UI should feel like a premium legal tool that Lane and Mariz can operate without training.

**The Bear.** The BlackBar Hero Image — a low-poly geometric bear holding brass scales of justice, with glowing orange eyes and brass wireframe veins on a dark field — is the visual soul of BlackBar. It is NOT a decorative afterthought. The bear appears in every major UI surface: as the login hero, the sidebar brand mark, the dashboard header, loading/processing states, empty states, the report watermark, and the export cover page. The bear conveys: power, precision, justice, aggression in service of defense. Every time a user sees the bear, they know BlackBar is working.

**Core Principles:**
1. **One primary action per screen.** Never present 3 equal buttons — one is always dominant.
2. **Progressive disclosure.** Show context as needed, collapse when not.
3. **Conversational guidance.** Empty states tell users exactly what to do. Transitions explain what just happened and what's next.
4. **Live feedback everywhere.** Every click produces immediate visual response. No silent waits.
5. **Print-grade typography.** Reports render in Times New Roman with justified text — same as the final PDF. Everything else is clean sans-serif.
6. **The bear is omnipresent.** Every screen has at least one bear treatment — full hero, silhouette watermark, icon mark, or animated variant.

---

## HERO IMAGE ASSET SPEC

### Source File

```
Location: Brand/blackbar-hero.png (also root/blackbar-hero.png)
Dimensions: ~1600×900px (landscape, 16:9-ish)
Subject: Low-poly geometric bear, aggressive stance, holding brass scales of justice
Color palette within image:
  - Body: dark charcoal/black polygons with brass/orange (#FF6B35, #D4A853) wireframe edges
  - Eyes: glowing orange (#FF6B35) emissive
  - Scales: brass/gold (#D4A853) metallic
  - Background: deep black with subtle gradient floor
  - Highlight sparkle: bottom-right 4-point star
```

### Derived Assets (Claude Code generates these at build time or via a preprocessing script)

| Asset | Dimensions | Treatment | Usage |
|-------|-----------|-----------|-------|
| `hero-full.png` | 1600×900 | Original, untouched | Login page hero, About/splash |
| `hero-cropped-upper.png` | 1600×600 | Crop to upper 2/3 (head + scales) | Dashboard header background |
| `hero-silhouette.png` | 800×800 | Desaturated to 8% opacity, centered bear only | Page background watermark |
| `hero-silhouette-light.png` | 800×800 | Same but 4% opacity | Report preview / print watermark |
| `bear-icon-48.png` | 48×48 | Tight crop of bear head only, circular mask | Sidebar brand mark, favicon |
| `bear-icon-24.png` | 24×24 | Same, smaller | Tab favicon, mobile icon |
| `bear-scales-only.png` | 200×200 | Crop just the scales of justice | QA stage icon, export badge |
| `hero-glow-fragment.png` | 400×400 | Crop the glowing chest wireframe area | Loading spinner background |

**Implementation note:** If image processing tooling (sharp, canvas) isn't available at build time, Claude Code should:
1. Copy `Brand/blackbar-hero.png` → `webapp/src/assets/hero.png` (replaces current generic hero)
2. Use CSS techniques (opacity, clip-path, filter, object-position) to create the visual variants at render time rather than pre-processing separate files
3. The CSS approach is preferred for v3 — fewer assets to manage

### CSS Utility Classes for Hero Image

```css
/* Full hero — login page, splash */
.hero-full {
  background-image: url('/src/assets/hero.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* Upper crop — dashboard header */
.hero-header {
  background-image: url('/src/assets/hero.png');
  background-size: 120% auto;
  background-position: center top;
  background-repeat: no-repeat;
}

/* Silhouette watermark — page backgrounds */
.hero-watermark {
  position: relative;
}
.hero-watermark::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/src/assets/hero.png');
  background-size: 60% auto;
  background-position: center center;
  background-repeat: no-repeat;
  opacity: 0.03;
  pointer-events: none;
  z-index: 0;
}

/* Stronger watermark — empty states, loading */
.hero-watermark-strong {
  position: relative;
}
.hero-watermark-strong::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/src/assets/hero.png');
  background-size: 50% auto;
  background-position: center center;
  background-repeat: no-repeat;
  opacity: 0.06;
  pointer-events: none;
  z-index: 0;
  filter: saturate(0.5);
}

/* Bear glow pulse — loading/processing states */
.hero-pulse {
  position: relative;
}
.hero-pulse::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/src/assets/hero.png');
  background-size: 40% auto;
  background-position: center center;
  background-repeat: no-repeat;
  opacity: 0.05;
  pointer-events: none;
  z-index: 0;
  animation: bearPulse 3s ease-in-out infinite;
}
@keyframes bearPulse {
  0%, 100% { opacity: 0.03; filter: brightness(1); }
  50% { opacity: 0.08; filter: brightness(1.3) saturate(1.5); }
}

/* Bear eyes glow — active agent processing */
.hero-eyes-glow::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/src/assets/hero.png');
  background-size: 30% auto;
  background-position: center 40%;
  background-repeat: no-repeat;
  opacity: 0.06;
  pointer-events: none;
  z-index: 0;
  animation: eyesGlow 2s ease-in-out infinite;
}
@keyframes eyesGlow {
  0%, 100% { opacity: 0.04; }
  50% { opacity: 0.10; }
}
```

---

## DESIGN TOKENS

### Colors

```css
:root {
  /* Surfaces */
  --bg-primary: #0A0A0F;          /* Deep charcoal — not pure black */
  --bg-secondary: #12121A;        /* Card/panel background */
  --bg-elevated: #1A1A25;         /* Hover, active states */
  --bg-glass: rgba(255,255,255,0.04);  /* Glass morphism fill */

  /* Accent — Brass/Orange (BlackBar brand) — matches bear wireframe */
  --accent-primary: #FF6B35;       /* Primary CTA, links, active states, bear eyes */
  --accent-hover: #FF8355;         /* Hover state */
  --accent-glow: rgba(255,107,53,0.12);  /* Glow behind active elements */
  --accent-subtle: rgba(255,107,53,0.08);  /* Subtle highlight */

  /* Secondary Accent — Gold/Brass — matches bear scales */
  --accent-secondary: #D4A853;     /* Secondary actions, tags, scales of justice */
  --accent-brass: #C4973B;         /* Darker brass for borders, dividers */

  /* Text */
  --text-primary: #F5F5F7;        /* Headings, primary content */
  --text-secondary: #B8B8C0;      /* Body text, descriptions */
  --text-muted: #6B6B78;          /* Labels, timestamps, meta */

  /* Semantic */
  --success: #34D399;             /* Completed stages, passing QA */
  --warning: #FBBF24;             /* QA warnings, pending items */
  --error: #F87171;               /* Errors, critical issues */
  --info: #60A5FA;                /* Informational, research findings */

  /* Borders */
  --border: rgba(255,255,255,0.06);
  --border-accent: rgba(255,107,53,0.30);
  --border-brass: rgba(212,168,83,0.25);

  /* Stage Colors */
  --stage-intake: #60A5FA;        /* Blue */
  --stage-research: #A78BFA;      /* Purple */
  --stage-drafting: #FF6B35;      /* Orange (brand) */
  --stage-qa: #FBBF24;           /* Yellow */
  --stage-export: #34D399;        /* Green */
}
```

### Typography

```css
/* Display — page titles, hero text */
font-family: 'Inter', system-ui, sans-serif;
font-weight: 700;
letter-spacing: -0.02em;

/* Body — UI text, descriptions */
font-family: 'Inter', system-ui, sans-serif;
font-weight: 400;
line-height: 1.6;

/* Mono — timestamps, IDs, technical metadata */
font-family: 'JetBrains Mono', 'SF Mono', monospace;
font-size: 0.75rem;

/* Report — rendered report content (matches final PDF) */
font-family: 'Times New Roman', Georgia, serif;
font-size: 12pt;
line-height: 1.6;
text-align: justify;
```

### Spacing Scale

```
4px  — tight (icon gaps, inline spacing)
8px  — compact (list item padding, small gaps)
12px — default (card padding-x, button padding-x)
16px — comfortable (section spacing)
24px — spacious (card padding, column gaps)
32px — section (between major UI blocks)
48px — page (top/bottom page margins)
```

### Glass Morphism Panel

```css
.glass {
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.glass-elevated {
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.glow-border {
  border: 1px solid var(--border-accent);
  box-shadow: 0 0 20px var(--accent-glow);
}

/* Brass border — for premium/export elements */
.brass-border {
  border: 1px solid var(--border-brass);
  box-shadow: 0 0 12px rgba(212,168,83,0.08);
}
```

### Animations

```css
/* Page transitions */
.page-enter { animation: fadeSlideUp 0.3s ease-out; }
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Card hover */
.card-hover {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}

/* Progress pulse */
.pulse-accent {
  animation: pulseGlow 2s ease-in-out infinite;
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 var(--accent-glow); }
  50% { box-shadow: 0 0 20px 4px var(--accent-glow); }
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-elevated) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## HERO IMAGE PLACEMENT MAP — WHERE THE BEAR LIVES

| Screen | Bear Treatment | Implementation | Visual Effect |
|--------|---------------|----------------|---------------|
| **Login** | Full hero image, left half of split layout | `hero-full` class on left panel | Bear dominates left 50%, form on right. First thing Lane sees. |
| **Login (mobile)** | Full bleed behind form at 15% opacity | `hero-watermark-strong` on form container | Bear visible through frosted glass form |
| **Sidebar** | Bear head icon (48px) as brand mark | `<img>` replacing Shield lucide icon | Top of sidebar, always visible, replaces generic icon |
| **Dashboard header** | Upper crop as full-width banner behind welcome text | `hero-header` class on header section, text overlays with gradient scrim | "Good morning, Lane" with bear looming behind, brass wireframe glowing |
| **Dashboard empty state** | Full bear centered at 8% opacity | `hero-watermark-strong` on empty container | Bear silhouette behind "Create your first case" CTA |
| **Case Intake — idle** | Silhouette watermark behind Agent Activity panel | `hero-watermark` on activity feed container | Subtle bear presence while waiting |
| **Case Intake — agent running** | Pulsing bear watermark, eyes glow animation | `hero-pulse` on activity feed container | Bear "breathes" while agent processes — eyes brighten on findings |
| **Case Research** | Scales of justice icon next to "Research Findings" header | CSS clip of scales area, or lucide Scale icon with brass color | Visual connection: bear's scales = weighing evidence |
| **Case Research — findings** | Bear watermark behind findings grid at 3% | `hero-watermark` on findings container | Bear is "behind" the analysis |
| **Case Drafting** | Subtle silhouette behind the rendered report pane | `hero-watermark` (2% opacity) on preview container | Bear presence during writing, barely visible |
| **Case QA** | Bear watermark pulsing behind score gauge | `hero-pulse` on QA panel when running | Bear "activating" during quality check |
| **Case QA — passed** | Bear with green glow effect (CSS filter) | Static watermark at 5%, `filter: hue-rotate(80deg)` | Bear turns greenish when QA passes — victory |
| **Case Export** | Bear as report cover page header / watermark on print preview | Rendered in export HTML at 4% behind SCG letterhead | Bear on the actual deliverable (subtle, professional) |
| **Case Export — download complete** | Bear celebration — brief 1s glow flash | `hero-eyes-glow` class applied for 1 second on download click | Eyes flash bright orange on successful export |
| **Loading screens** | Bear silhouette with pulse animation, centered | `hero-pulse` centered in loading container | Every loading state shows the bear breathing |
| **Error states** | Bear silhouette at 5% behind error message | `hero-watermark-strong` with `filter: hue-rotate(0deg) saturate(2)` | Bear turns reddish on errors |
| **404 / Not Found** | Full bear image at 20% with "Case not found" overlay | Full-width hero background with text | Strong bear presence on dead ends |
| **Favicon** | Bear head, 24×24 | Pre-cropped `bear-icon-24.png` or CSS-driven | Browser tab shows the bear |
| **PWA icon** | Bear head, 192×192 and 512×512 | Pre-cropped from hero | Home screen icon on mobile |

---

## COMPONENT LIBRARY

### 0. BearMark (NEW — v3)

```tsx
interface BearMarkProps {
  variant: 'icon' | 'watermark' | 'hero' | 'pulse' | 'glow';
  size?: 'sm' | 'md' | 'lg' | 'full';
  opacity?: number;           // override default per-variant opacity
  className?: string;
}
```

**Central component for all bear image treatments:**

| Variant | Default Size | Default Opacity | Behavior |
|---------|-------------|-----------------|----------|
| `icon` | 48×48 | 1.0 | Static bear head crop — sidebar, nav |
| `watermark` | 60% of container | 0.03 | Static silhouette behind content |
| `hero` | 100% width | 1.0 | Full image — login, 404, splash |
| `pulse` | 40% of container | 0.05 | Breathing animation — loading, agent running |
| `glow` | 30% of container | 0.06 | Eyes brighten animation — active processing |

**Implementation:**
```tsx
export default function BearMark({ variant, size = 'md', opacity, className }: BearMarkProps) {
  const baseClass = {
    icon: 'bear-icon',
    watermark: 'hero-watermark',
    hero: 'hero-full',
    pulse: 'hero-pulse',
    glow: 'hero-eyes-glow',
  }[variant];

  const sizeClass = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-24 h-24',
    full: 'w-full h-full',
  }[size];

  if (variant === 'icon') {
    return (
      <img
        src="/src/assets/hero.png"
        alt="BlackBar"
        className={`${sizeClass} object-cover object-[50%_25%] rounded-full ${className || ''}`}
        style={opacity !== undefined ? { opacity } : undefined}
      />
    );
  }

  // For watermark/pulse/glow variants, render as a positioned pseudo-element container
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${baseClass} ${className || ''}`}
      style={opacity !== undefined ? { '--bear-opacity': opacity } as React.CSSProperties : undefined}
    />
  );
}
```

**Usage examples:**
```tsx
{/* Sidebar brand mark */}
<BearMark variant="icon" size="md" />

{/* Behind Agent Activity when idle */}
<div className="relative">
  <BearMark variant="watermark" />
  <AgentActivityFeedV2 ... />
</div>

{/* Agent processing state */}
<div className="relative">
  <BearMark variant="pulse" />
  <AgentActivityFeedV2 ... />
</div>

{/* Login hero */}
<div className="relative w-1/2 h-screen">
  <BearMark variant="hero" size="full" />
</div>
```

### 1. GlassCard

```tsx
interface GlassCardProps {
  children: React.ReactNode;
  glow?: boolean;          // orange glow border
  elevated?: boolean;      // stronger glass effect
  padding?: 'compact' | 'default' | 'spacious';
  bearWatermark?: boolean; // show bear silhouette behind card content
  className?: string;
}
```

Used for: every panel, sidebar section, stat card, document card. When `bearWatermark` is true, the bear silhouette shows at 2% opacity behind the card content — used for hero panels like the welcome card and QA score.

### 2. StageNavV2

```tsx
interface StageNavV2Props {
  currentStage: 'intake' | 'research' | 'drafting' | 'qa' | 'export';
  completedStages: string[];
  agentRunning?: boolean;
  onNavigate: (stage: string) => void;
}
```

**Behavior changes from v1:**
- Each stage shows a **colored dot** with stage-specific color (not just green/gray)
- Running stage has **animated pulse ring** around the dot
- Clicking a completed stage shows its output (not just navigates)
- Between stages: thin **progress line** fills as the agent works
- Hover: tooltip showing "Intake — Completed in 4.2s" or "Research — Waiting for approval"
- **Bear integration:** The QA stage dot uses the brass scales icon instead of a generic circle

### 3. ContextualActionButton

```tsx
interface ContextualActionButtonProps {
  stage: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  onAction: () => void;
  disabled?: boolean;
}
```

**Per-stage rendering:**

| Stage | Idle Text | Idle Subtext | Running Text | Complete Text |
|-------|----------|-------------|-------------|--------------|
| intake | "Analyze Documents" | "Classify case, confirm jurisdiction, flag opposing expert" | "Analyzing..." | "Analysis Complete — Review Below" |
| research | "Run Research" | "Resolve flags, identify attack patterns, catalog citations" | "Researching..." | "Research Complete — 4 patterns found" |
| drafting | "Generate Draft" | "Draft report in Lane's voice using research findings" | "Drafting..." | "Draft Complete — 7 sections, review below" |
| qa | "Run QA Audit" | "Check voice, terms, dates, format, benchmark similarity" | "Auditing..." | "QA Complete — Score: 94/100" |
| export | "Export Report" | "Download as DOCX, PDF, or HTML" | N/A | N/A |

**Bear integration:** Running state shows a tiny bear icon (16px) with pulse animation next to the spinner text. The bear is "working."

### 4. AgentActivityFeedV2

```tsx
interface AgentActivityFeedV2Props {
  logs: SSEMessage[];
  stage: string;
  status: 'idle' | 'running' | 'complete' | 'error';
}
```

**Visual redesign:**
- **Empty state:** Bear silhouette watermark (8% opacity) centered behind "Agent is standing by. Click [action button name] to begin."
- **Running:** Bear watermark shifts to `pulse` variant — breathing animation while logs stream in. Live-updating log with typed icons per message type:
  - `progress` → animated spinner dot + message
  - `finding` → search icon + highlighted card with confidence badge
  - `complete` → checkmark + green highlight + elapsed time + bear eyes flash once
  - `error` → red alert + retry link
- **Brain section callouts:** When message mentions "Brain §X", show as a chip/tag that references ENTERPRISE_BRAIN.md section
- **Auto-scroll** to bottom with "jump to latest" button if user scrolls up
- **Elapsed timer** in header: "Running for 3.2s" (updates live)
- **Completion celebration:** On `complete` message, the bear watermark briefly flashes brighter (1s transition to 10% opacity then back to 3%)

### 5. DocumentCard

```tsx
interface DocumentCardProps {
  doc: Doc;
  onPreview: (docId: string) => void;
  onRemove?: (docId: string) => void;
  processing?: boolean;
}
```

**Visual:** Filename, page count, size, upload time. Click → opens inline PDF viewer (react-pdf). Processing state shows extraction progress bar.

### 6. InlinePDFViewer

```tsx
interface InlinePDFViewerProps {
  filepath: string;
  onClose: () => void;
  highlightText?: string[];   // search terms to highlight
}
```

**Implementation:** `react-pdf` wrapper. Renders in a side panel (right 40% of screen) or modal. Page navigation, zoom, text selection. Highlight search terms for cross-referencing.

### 7. HumanCheckpointV2

```tsx
interface HumanCheckpointV2Props {
  stage: string;
  summary: string;
  findings?: Finding[];        // structured data, not just text
  qaScore?: number;            // 0-100 for QA stage
  onApprove: () => void;
  onRevise: (notes: string) => void;
  onReject: () => void;
}
```

**Visual redesign:**
- Full-width overlay with frosted glass background
- **Bear watermark at 5% behind the entire modal** — the bear is "presenting" the findings
- Summary section with key findings as cards (not just text)
- QA stage: circular score gauge (0-100) with pass/warn/fail color
- Approve button is primary (orange, large); Revise is secondary; Reject is text-only
- Revise mode: textarea with "What should the agent do differently?" placeholder
- **Bear integration:** When approving, the bear watermark briefly glows green (hue-rotate) for 0.5s before the modal closes

### 8. SkeletonLoader

```tsx
interface SkeletonLoaderProps {
  type: 'card' | 'list' | 'text' | 'stat';
  count?: number;
}
```

Replace all "Loading..." text strings with animated skeleton loaders matching the shape of expected content. **Full-page loading states include the bear `pulse` variant centered behind the skeletons.**

### 9. EmptyState

```tsx
interface EmptyStateProps {
  icon?: LucideIcon;         // optional — if omitted, uses BearMark
  useBear?: boolean;         // default true — show bear watermark behind empty state
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}
```

Every page section has a contextual empty state. No "No data" messages — always tell the user what to do. **Default behavior: bear silhouette watermark (6% opacity) behind every empty state.** The bear serves as a visual anchor, making even empty pages feel intentional and branded.

---

## SCREEN-BY-SCREEN SPECS

### Screen 1: Login

**Current:** Email/password form with "Savage Wins" tagline. Functional but generic.

**v3 — Split Layout with Full Bear Hero:**

```
┌─────────────────────────────┬─────────────────────────────┐
│                             │                             │
│                             │     ┌─────────────────┐     │
│                             │     │   [Bear Icon]   │     │
│     ┌───────────────────┐   │     │   B L A C K B A R│     │
│     │                   │   │     │ "Savage Wins"    │     │
│     │   FULL BEAR HERO  │   │     └─────────────────┘     │
│     │   IMAGE           │   │                             │
│     │                   │   │     ┌─────────────────┐     │
│     │   (glowing eyes,  │   │     │ Email            │     │
│     │    scales of      │   │     │ Password    [👁] │     │
│     │    justice,       │   │     │                 │     │
│     │    brass wireframe│   │     │ [  Sign In  →]  │     │
│     │    veins)         │   │     └─────────────────┘     │
│     │                   │   │                             │
│     └───────────────────┘   │     AI-Assisted Expert      │
│                             │     Report Drafting         │
│                             │                             │
│     "Every report is a      │     Swainston Consulting    │
│      controlled demolition" │     Group                   │
│                             │                             │
└─────────────────────────────┴─────────────────────────────┘
```

**Key details:**
- **Left panel (50%):** Full bear hero image, edge-to-edge, dark background blends into page. CSS: `hero-full` class, `object-fit: cover`. Tagline overlay at bottom: "Every report is a controlled demolition" in text-muted with subtle text-shadow.
- **Right panel (50%):** Dark charcoal background (`--bg-primary`). Bear head icon (48px) above "BLACKBAR" wordmark. Form fields with glass morphism styling, orange focus ring. "Sign In" button: full-width, `--accent-primary`, arrow icon.
- **Responsive:** On screens <1024px, left panel collapses. Bear becomes a full-bleed background at 12% opacity behind the form (`hero-watermark-strong` class). Form gets glass-elevated treatment.
- **Error messages:** slide-in from bottom of form, not replace content.

**Files touched:** `Login.tsx`, copy `Brand/blackbar-hero.png` → `src/assets/hero.png`

### Screen 2: Dashboard

**Current:** Stats grid (4 cards), case list table, new case modal. Functional.

**v3 — Bear Banner Header:**

```
┌──────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [HERO UPPER CROP — bear head + scales, 200px tall]    │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  gradient scrim (bottom: rgba(10,10,15,0.95))    │  │  │
│  │  │  Good morning, Lane.     Wednesday, 1 April 2026 │  │  │
│  │  │  Next deadline: Gleason — 15 Apr (14 days)       │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                       │
│  │Active│ │In QA │ │Export│ │Avg   │                       │
│  │Cases │ │      │ │Ready │ │Days  │                       │
│  │  3   │ │  1   │ │  1   │ │ 4.2  │                       │
│  └──────┘ └──────┘ └──────┘ └──────┘                       │
│                                                              │
│  [ + New Case ]  [ Resume: Gleason → QA ]                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Case List                                              │  │
│  │ Gleason ● QA    ████████░░ 80%   15 Apr   Peterson    │  │
│  │ Heagy   ● Draft █████░░░░░ 50%   20 Apr   Peterson    │  │
│  │ Anderson● Export██████████ 100%  30 Mar   Peterson    │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Bear integration:**
- **Header banner:** `hero-header` class (upper crop of bear, 200px height). A gradient scrim (`linear-gradient(transparent 0%, rgba(10,10,15,0.95) 100%)`) fades the bottom so text is readable. The bear's head and scales are visible at top.
- **Empty state:** If no cases, the full bear appears centered at 8% opacity with "Create your first case to get started" and a "New Case" CTA.
- **Stats grid:** Keep 4 cards with micro-sparklines. Each card has subtle bear watermark at 2% — barely visible but adds texture.

**Files touched:** `Dashboard.tsx`

### Screen 3: Case Intake (the critical screen)

**Current:** 3-column grid — metadata | upload zone + file list + Start Analysis | Agent Activity. Upload and analysis feel disconnected.

**v3 Redesign — Guided Flow with Bear Activity State:**

```
┌──────────────────────────────────────────────────────────────┐
│  Header: [Case Name] — Initial Report — Clark County         │
│  StageNavV2: ● Intake  ○ Research  ○ Drafting  ○ QA  ○ Export│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────┐  ┌────────────────────────┐ │
│  │  STEP 1: Upload Documents   │  │  Case Details          │ │
│  │                             │  │  (collapsible sidebar) │ │
│  │  ┌───────────────────────┐  │  │                        │ │
│  │  │   Drop zone           │  │  │  Case Type: Slip & Fall│ │
│  │  │   (drag PDF/DOCX)     │  │  │  Report: Initial       │ │
│  │  └───────────────────────┘  │  │  Jurisdiction: Clark Co│ │
│  │                             │  │  Expert: Peterson       │ │
│  │  ┌ Uploaded Documents ────┐ │  │  Deadline: 15 Apr 2026 │ │
│  │  │ Gleason Report.pdf  📄│ │  │                        │ │
│  │  │ 20 pages · 2MB   [👁]  │ │  └────────────────────────┘ │
│  │  │ Deposition.pdf     📄│ │                              │
│  │  │ 45 pages · 512KB [👁]  │ │  ┌────────────────────────┐ │
│  │  └────────────────────────┘ │  │  Agent Activity         │ │
│  │                             │  │                        │ │
│  │  STEP 2: Run Analysis       │  │  ┌──────────────────┐  │ │
│  │  ┌───────────────────────┐  │  │  │  [BEAR WATERMARK] │  │ │
│  │  │ 🐻 Analyze Documents  │  │  │  │  (pulse when     │  │ │
│  │  │ Classify case, confirm│  │  │  │   running, static │  │ │
│  │  │ jurisdiction, flag    │  │  │  │   when idle)      │  │ │
│  │  │ opposing expert       │  │  │  │  Agent standing by│  │ │
│  │  └───────────────────────┘  │  │  └──────────────────┘  │ │
│  └─────────────────────────────┘  └────────────────────────┘ │
│                                                              │
│  [HumanCheckpoint overlay with bear watermark behind modal]  │
└──────────────────────────────────────────────────────────────┘
```

**Bear integration:**
- **Agent Activity idle:** Bear `watermark` variant centered in the empty feed area with "Agent standing by" text below it. The bear silhouette makes the empty state feel premium, not broken.
- **Agent Activity running:** Bear switches to `pulse` variant — breathing animation while logs stream in. Bear opacity rises from 3% to 6% as more logs arrive, peaking at "complete."
- **Agent Activity complete:** Bear `glow` variant — eyes brighten for 1 second, then the HumanCheckpoint overlay slides in with bear watermark behind the modal.
- **Action button:** Tiny bear icon (16px) in the "Analyze Documents" button, left of the text. When running, the icon has a subtle spin animation.

**Key UX changes (carried from v2):**
1. Upload and Analyze in the **same column** — visually connected workflow
2. Preview icon on documents → InlinePDFViewer
3. ContextualActionButton with stage-specific text
4. Case Details collapsible
5. Real page counts from PDF extraction

**Files touched:** `CaseIntake.tsx`, new `DocumentCard.tsx`, new `InlinePDFViewer.tsx`, new `BearMark.tsx`

### Screen 4: Case Research

**Current:** Mock findings in cards, Run Research button, Agent Activity, HumanCheckpoint.

**v3 Changes:**
- **Findings grid** with bear watermark at 3% behind the container
- **Findings become structured cards** with: Attack pattern ID (ATK-01), confidence badge (0-100%), reasoning excerpt, source citation, and "View in Document" link
- **Brain query display:** Show which ENTERPRISE_BRAIN sections were consulted (§6, §8, §10) as chips
- **Citation catalog:** Collapsible section showing all codes/standards referenced
- **Comparative view:** If opposing expert report is uploaded, show side-by-side: their claim | our counter-argument
- **Bear integration:** The "Research Findings" section header uses the brass scales icon (`--accent-secondary` color) — visual echo of the bear's scales of justice. The scales represent "weighing the evidence."

**Files touched:** `CaseResearch.tsx`, new `FindingCard.tsx`

### Screen 5: Case Drafting

**Current:** 6-section navigator, HTML editor with preview/source toggle, Run Drafting Agent, Save Draft, Approve.

**v3 Changes:**
- **Section navigator** moves to a vertical sidebar (left) instead of horizontal tabs
- **Editor** gets a **split-pane view**: rendered report on left (Times New Roman, justified, print-preview), source HTML on right (code editor with syntax highlighting)
- **Inline editing:** Click any paragraph in the rendered view to edit it directly (contentEditable)
- **Voice warnings:** If user types a prohibited term (from VOICE.md §11), show inline red underline with tooltip: "SCG doesn't use 'prior to' — use 'before'"
- **Auto-save** every 30 seconds with version badge incrementing
- **Word count** per section in the section navigator
- **Bear integration:** Very subtle — `hero-watermark` at 2% behind the rendered report pane. The bear is "watching" the draft. Just enough to add texture to the white-ish print preview background without distracting from the text.

**Files touched:** `CaseDrafting.tsx`, new `SplitEditor.tsx`, new `VoiceChecker.ts`

### Screen 6: Case QA

**Current:** Mock 8-check quality score, issue cards.

**v3 Changes:**
- **Circular score gauge** (0-100) as hero element — green >90, yellow 70-90, red <70
- **Check cards** with expand/collapse — each shows: check name, pass/fail, severity, location in draft, suggested fix, "Go to section" link
- **Benchmark comparison:** "This draft most closely matches: Gleason (Initial Report) — 94% similarity"
- **Prohibited term scan results:** List every flagged term with location and replacement
- **One-click fix:** For certain issues (date format, prohibited terms), offer "Auto-fix" button
- **Bear integration:**
  - **QA running:** Bear `pulse` variant behind the score gauge area — bear is "evaluating"
  - **QA passed (>90):** Bear watermark gets a CSS `filter: hue-rotate(80deg) brightness(1.2)` — bear turns subtly green/gold. Victory state.
  - **QA failed (<70):** Bear watermark gets `filter: hue-rotate(0deg) saturate(2)` — bear turns reddish. Warning state.
  - **Score gauge ring:** At the top of the circular gauge, a tiny bear icon sits at the "needle" position showing where the score lands

**Files touched:** `CaseQA.tsx`, new `ScoreGauge.tsx`, new `QACheckCard.tsx`

### Screen 7: Case Export

**Current:** Report preview (left 2/3), metadata + download sidebar (right 1/3). HTML download works, PDF/DOCX disabled.

**v3 Changes:**
- **Full print preview:** Report renders exactly as it will appear in the DOCX — SCG letterhead, Lane + Mariz signatures, proper margins
- **Download buttons:** All three active — HTML (existing), DOCX (docxtemplater), PDF (Puppeteer server-side)
- **QA badge:** Show QA score and check count: "✓ QA Passed — 94/100, 8/8 checks"
- **Version history:** Collapsible list of all draft versions with timestamps
- **Share controls:** [FUTURE] Email to attorney, generate secure link
- **Bear integration:**
  - **Report watermark:** The print preview includes the bear at 3-4% opacity as a full-page background watermark behind the report content — like a legal watermark. CSS: `hero-silhouette-light` treatment on the preview container. This appears in the actual exported HTML/DOCX/PDF as well.
  - **Download success:** On clicking any download button and successful completion, the bear `glow` variant fires for 1 second — eyes flash orange. A brief celebratory micro-interaction.
  - **Export sidebar:** The metadata card has a brass-border treatment (`brass-border` class) — echoing the bear's scales color.

**Files touched:** `CaseExport.tsx`

---

## SIDEBAR REDESIGN

**Current:** Fixed w-60, Shield icon, Dashboard + Cases links, user profile at bottom.

**v3 Changes:**
- **Bear brand mark:** Replace the generic Shield lucide icon with the actual bear head (BearMark `icon` variant, 48px, circular crop). The bear head is cropped from the hero image at approximately the 50% horizontal / 25% vertical position to capture the face + glowing eyes.
- Below the bear: "BLACKBAR" in `Inter 700`, letter-spacing 0.15em, `--text-primary`. Below that: "Savage Wins" in `Inter 400`, text-xs, `--text-muted`.
- **Navigation:** Dashboard, Active Cases (expandable with case names showing stage dots), Reference Library [FUTURE], Settings [FUTURE]
- **Recent cases:** Quick-access list of last 3 cases with stage color indicators
- **Collapse mode:** Sidebar collapses to w-16 on smaller screens — the bear icon shrinks to 32px and becomes the only visible brand element. Clean.
- **User section at bottom:** Avatar circle with user initials + name + role badge (Admin/Operator) + logout button
- **Bear separator:** A thin horizontal brass line (`border-brass`) separates the brand section from navigation

**Files touched:** `Sidebar.tsx`

---

## 404 / ERROR PAGE

**New page — not in v2:**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│           ┌──────────────────────────────┐                   │
│           │                              │                   │
│           │   [FULL BEAR IMAGE — 30%     │                   │
│           │    opacity, centered]         │                   │
│           │                              │                   │
│           └──────────────────────────────┘                   │
│                                                              │
│              Case Not Found                                  │
│              The bear searched everywhere.                    │
│                                                              │
│              [ ← Back to Dashboard ]                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

The bear at 30% opacity is the strongest non-login usage — a full visual statement on the error page. Copy is light: "The bear searched everywhere." Reinforces brand personality without being corny.

**Files touched:** New `src/pages/NotFound.tsx`, add route in `App.tsx`

---

## IMPLEMENTATION PRIORITY

### Sprint 1: Fix the Pipeline (Day 1-2)

These are non-visual but unblock everything:

```
□ Fix SSE auth — add query param fallback to auth.ts middleware
□ Add ANTHROPIC_API_KEY to Railway env vars
□ Install @anthropic-ai/sdk
□ Create promptLoader.ts — reads VOICE.md + BRAIN.md, injects into system prompt
□ Replace MOCK_STREAMS in agents.ts with real Claude API calls for intake stage
□ Test: trigger intake → receive real SSE messages → checkpoint appears
```

### Sprint 2: Bear + Core UI Polish (Day 2-3)

```
□ Copy Brand/blackbar-hero.png → webapp/src/assets/hero.png
□ Create BearMark component with all 5 variants
□ Add hero CSS utility classes (watermark, pulse, glow, header, full)
□ Design tokens — update tailwind.config.ts with full token set including brass
□ SkeletonLoader component with bear pulse behind full-page loads
□ EmptyState component with bear watermark default
□ StageNavV2 — colored dots, pulse animation, progress lines, scales icon on QA
□ ContextualActionButton — per-stage text, bear icon in running state
□ AgentActivityFeedV2 — live timer, typed icons, bear pulse/glow states
□ HumanCheckpointV2 — full-width overlay, bear watermark, green glow on approve
```

### Sprint 3: Login + Dashboard Bear Treatment (Day 3)

```
□ Login.tsx — split layout with full bear left panel, form right
□ Dashboard header — hero-header crop with gradient scrim
□ Dashboard empty state — full bear watermark + CTA
□ Sidebar — BearMark icon replacing Shield, brass separator, collapse mode
□ 404 page — NotFound.tsx with full bear at 30%
□ Favicon from bear head crop
```

### Sprint 4: Document Experience (Day 3-4)

```
□ Install react-pdf
□ DocumentCard component with preview trigger
□ InlinePDFViewer — side panel rendering, page nav, zoom
□ PDF text extraction on upload (pdf-parse)
□ Real page count in document cards
□ Upload progress indicator
```

### Sprint 5: Editor + QA (Day 4-5)

```
□ SplitEditor — rendered | source side-by-side, bear watermark at 2% on preview
□ VoiceChecker — inline prohibited term detection
□ ScoreGauge — circular 0-100 with bear icon at needle position
□ QACheckCard — expand/collapse with auto-fix buttons
□ QA bear state changes (green on pass, red on fail)
□ Section word counts in drafting navigator
□ Auto-save with version badge
```

### Sprint 6: Export + Final Polish (Day 5)

```
□ DOCX export (docxtemplater with SCG letterhead + bear watermark)
□ PDF export (Puppeteer server-side, bear watermark in print CSS)
□ Print preview with bear watermark in report
□ Export download success — bear eyes glow flash
□ Export sidebar — brass-border treatment
□ Page transitions (fadeSlideUp on route changes)
□ Bear watermark on Case Research findings grid
□ Scales icon on Research Findings header
```

---

## SUPERVISED DRY-RUN MODE

For Monday's demo with Lane, the system runs in supervised mode:

```typescript
// server/services/agentRunner.ts
const SUPERVISED_MODE = process.env.SUPERVISED_MODE === 'true';

// In Research Agent:
if (SUPERVISED_MODE && brainQuery.includes('§8 Code Citation')) {
  broadcastToCase(caseId, {
    type: 'human_input_needed',
    message: 'Code edition lookup needed — which IBC edition applies to this jurisdiction and permit year?',
    metadata: { field: 'codeEdition', jurisdiction, permitYear }
  });
}
```

**Env vars for supervised mode:**
```
SUPERVISED_MODE=true
ANTHROPIC_API_KEY=sk-ant-...
VOICE_MD_PATH=../VOICE.md
BRAIN_MD_PATH=../ENTERPRISE_BRAIN.md
```

---

## DEPENDENCIES TO ADD

```json
{
  "@anthropic-ai/sdk": "^1.0.0",
  "react-pdf": "^9.0.0",
  "pdf-parse": "^1.1.1",
  "mammoth": "^1.8.0",
  "docxtemplater": "^3.50.0",
  "pizzip": "^3.1.7",
  "framer-motion": "^12.0.0",
  "@tanstack/react-query": "^5.0.0",
  "pg-boss": "^10.0.0"
}
```

**Why pg-boss over BullMQ:** Eliminates Redis dependency — uses the existing Railway Postgres for job queue. One fewer service to manage for a 3-user system.

---

## FILE MANIFEST — WHAT CLAUDE CODE CREATES

### New Files

| File | Purpose |
|------|---------|
| `src/components/shared/BearMark.tsx` | **Central hero image component — 5 variants (icon, watermark, hero, pulse, glow)** |
| `src/assets/hero.png` | **Copy of Brand/blackbar-hero.png — the bear** |
| `src/pages/NotFound.tsx` | **404 page with full bear at 30%** |
| `server/services/promptLoader.ts` | Reads VOICE.md + BRAIN.md, constructs system prompts per stage |
| `server/services/agentRunner.ts` | Replaces MOCK_STREAMS — real Claude API calls with SSE broadcasting |
| `server/services/documentProcessor.ts` | PDF/DOCX text extraction on upload |
| `server/services/chunker.ts` | Text → overlapping chunks with metadata |
| `server/services/docxExporter.ts` | DOCX report generation from HTML content |
| `server/services/voiceValidator.ts` | Prohibited term checker (server + client) |
| `server/prompts/intake.md` | Intake agent system prompt template |
| `server/prompts/research.md` | Research agent system prompt template |
| `server/prompts/drafting.md` | Drafting agent system prompt template |
| `server/prompts/qa.md` | QA agent system prompt template |
| `src/components/shared/DocumentCard.tsx` | Document display with preview trigger |
| `src/components/shared/InlinePDFViewer.tsx` | react-pdf wrapper in side panel |
| `src/components/shared/ContextualActionButton.tsx` | Per-stage action button with bear icon |
| `src/components/shared/ScoreGauge.tsx` | Circular QA score with bear at needle |
| `src/components/shared/QACheckCard.tsx` | Expandable QA check result |
| `src/components/shared/SkeletonLoader.tsx` | Animated loading with bear pulse behind |
| `src/components/shared/EmptyState.tsx` | Contextual empty state with bear watermark |
| `src/components/shared/SplitEditor.tsx` | Rendered + source side-by-side editor |
| `src/lib/voiceChecker.ts` | Client-side prohibited term detection |

### Modified Files

| File | Changes |
|------|---------|
| `server/middleware/auth.ts` | Add query param token fallback for SSE |
| `server/routes/agents.ts` | Replace MOCK_STREAMS with agentRunner calls |
| `server/routes/documents.ts` | Add text extraction on upload, real page count |
| `server/routes/reports.ts` | Add DOCX export endpoint |
| `prisma/schema.prisma` | Add DocumentChunk model (if pgvector sprint included) |
| `package.json` | Add new dependencies |
| `src/App.tsx` | Add NotFound route |
| `src/index.css` | Add hero CSS utility classes (watermark, pulse, glow, header, full, brass-border) |
| `src/pages/Login.tsx` | **Split layout with full bear hero left panel** |
| `src/pages/Dashboard.tsx` | **Bear banner header, empty state with bear** |
| `src/pages/CaseIntake.tsx` | Guided flow, bear in Agent Activity (idle/pulse/glow states) |
| `src/pages/CaseResearch.tsx` | Structured findings, bear watermark, scales icon |
| `src/pages/CaseDrafting.tsx` | SplitEditor, VoiceChecker, bear watermark on preview |
| `src/pages/CaseQA.tsx` | ScoreGauge, bear state changes (green pass / red fail) |
| `src/pages/CaseExport.tsx` | Print preview with bear watermark, eyes glow on download |
| `src/components/layout/Sidebar.tsx` | **Bear head icon replacing Shield, brass separator** |
| `src/components/shared/StageNav.tsx` | V2 with scales icon on QA stage |
| `src/components/shared/AgentActivityFeed.tsx` | Bear pulse/glow states per agent status |
| `src/components/shared/HumanCheckpoint.tsx` | Bear watermark behind modal, green glow on approve |

---

## BEAR INTEGRATION RULES FOR CLAUDE CODE

These rules ensure consistency when implementing bear treatments across the app:

1. **Never use the bear at >30% opacity** except on the Login hero panel (100%) and 404 page (30%). All in-app usage is 2-10%.
2. **The bear always uses `pointer-events: none`** — it never interferes with clicks or interaction.
3. **Pulse variant is reserved for active processing states only.** Don't pulse when idle.
4. **Glow variant (eyes brighten) is reserved for milestone moments:** completion, approval, export success. Max duration 1 second.
5. **Color shifts (hue-rotate) are reserved for QA results only:** green on pass, red on fail. No color shifts elsewhere.
6. **The sidebar bear icon is always the head crop** — never show the full bear in the sidebar.
7. **Report watermark (export) uses `hero-silhouette-light` (4% opacity)** — must be subtle enough that a printed report looks professional, not like it has a ghost bear behind it.
8. **All bear treatments use the same source image** (`src/assets/hero.png`). CSS handles cropping, opacity, animation, and filters. No pre-processed image variants needed for v3.
9. **The `BearMark` component is the single source of truth.** Never inline bear image references — always use `<BearMark variant="..." />`.
10. **Dark backgrounds only.** The bear image has a dark background — don't place it on light surfaces without an opacity < 5%.

---

## VALIDATION CRITERIA

After Claude Code executes this spec, verify:

1. **Bear visible on every screen:** Login (hero), Dashboard (header + empty), Sidebar (icon), Intake (activity feed), Research (watermark + scales), Drafting (preview watermark), QA (pulse + color shift), Export (report watermark + download glow), 404 (full bear)
2. **Bear animations work:** Pulse on agent running, glow on completion, green shift on QA pass, eyes flash on export download
3. **SSE works:** Click "Analyze Documents" → Agent Activity feed shows live messages with bear pulsing → checkpoint appears with bear watermark
4. **Voice injected:** Claude API calls include VOICE.md in system prompt
5. **Documents viewable:** Upload a PDF → click preview icon → PDF renders inline
6. **Guided flow:** Mariz can create a case and reach Export without help
7. **Empty states:** Bear watermark behind every empty state — no bare "No data" text
8. **Report quality:** Generated draft reads like Lane wrote it
9. **Export works:** HTML, DOCX, PDF all download with bear watermark on the document
10. **QA score:** Numerical score, bear state reflects pass/fail

---

*Spec v3.0 — Built 1 April 2026 for Monday demo with Lane & Mariz*
*Key v2→v3 change: Hero Bear Image integrated as omnipresent brand element across all screens*
*Pairs with: ARCHITECTURE_AUDIT_v1.1.md (root cause analysis + execution plan)*
