# BlackBar Prowl Architecture

> The bear prowls ahead. The sentinel stands guard. Signals feed the loop.
> Prowl → Sentinel → Signal → Promote or Discard.

---

## What It Is

After each agent stage completes, BlackBar's Prowl Engine predicts the most likely human action (approve) and pre-executes the next stage before Lane acts. Results live in an overlay — invisible until promoted.

When Lane approves: the next stage is already done. Instant transition.
When Lane revises: prowl output is discarded, stage re-runs with feedback.
When Lane rejects: prowl output is discarded, pipeline halts.

This is CPU branch prediction applied to an AI agent pipeline.

## Three-System Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   PROWL ENGINE (prowl.ts)                                   │
│   ───────────────────────                                   │
│   After stage N completes:                                  │
│   1. Check acceptance rate for stage N (>70% → prowl)       │
│   2. Fork background agent call for stage N+1               │
│   3. Use fast model (Sonnet) — cheap, aggressive            │
│   4. Store result in overlay (never visible to Lane)        │
│   5. On completion → hand off to Sentinel                   │
│                                                             │
│   SENTINEL GATE (sentinel.ts)                               │
│   ───────────────────────────                               │
│   Validates prowl output with smart model (Opus):           │
│   1. Voice compliance — does it sound like Lane?            │
│   2. Legal safety — no prohibited terms, no FRE 407?        │
│   3. Factual accuracy — citations correct?                  │
│   4. Structural integrity — right format?                   │
│   Score < 80 → discard prowl before Lane sees it            │
│   Score >= 80 → mark as validated, ready for promotion      │
│                                                             │
│   SIGNAL FRAMEWORK (pipelineMetrics.ts)                     │
│   ─────────────────────────────────────                     │
│   Records everything:                                       │
│   - Prediction accuracy (promoted vs discarded)             │
│   - Time saved per promoted prowl                           │
│   - Sentinel effectiveness (false positives/negatives)      │
│   - Cost: prowl spend vs real spend                         │
│   - Chain depth (how many stages ahead did we get?)         │
│   Every case generates signal for the system.               │
│   Acceptance rates improve → prowl gets more                │
│   aggressive → pipeline gets faster.                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Execution Flow

```
Case: Gleason — Initial Report — Slip & Fall

INTAKE AGENT completes (4.2s)
  ├── Result: intake.md posted to case folder
  ├── SSE: "Intake complete — case classified"
  ├── HumanCheckpoint shown to Lane
  │
  │   [BACKGROUND: Prowl engine activates]
  │   ├── Acceptance rate for intake: 92% → PROWL
  │   ├── Fork: Research Agent (Sonnet, prowl=true)
  │   │   ├── Reads intake.md + BRAIN §6,8,9,10
  │   │   ├── Scans for attack patterns
  │   │   └── Produces: research.md (prowl)
  │   ├── Sentinel (Opus) validates research.md
  │   │   ├── Attack patterns valid? ✓ (88/100)
  │   │   ├── Citations correct? ✓ (92/100)
  │   │   ├── Completeness? ✓ (85/100)
  │   │   └── Overall: 88/100 → VALIDATED
  │   └── Status: prowl ready for promotion
  │
  │   [Meanwhile, Lane is reviewing intake results...]
  │
  └── Lane clicks APPROVE (45 seconds later)
      ├── resolveProwl() called
      ├── Prowl status: validated (88/100)
      ├── PROMOTED — research.md becomes the real result
      ├── SSE: "Research pre-computed — saved 12.3s"
      ├── Case advances to Research stage (already complete!)
      │
      │   [BACKGROUND: Prowl chains forward]
      │   ├── Acceptance rate for research: 78% → PROWL
      │   ├── Fork: Drafting Agent (Sonnet, prowl)
      │   └── ... (same pattern)
      │
      └── Lane sees Research findings immediately
          No wait. No spinner. Instant.

  ─── If Lane had clicked REVISE instead: ───
      ├── resolveProwl() called with action='revise'
      ├── Prowl DISCARDED
      ├── Research Agent re-runs with Lane's feedback notes
      └── New prowl starts after the revised research completes
```

## Model Strategy

| Role | Model | Why |
|------|-------|-----|
| Prowl (generation) | `claude-sonnet-4-6` | Cheap ($3/$15 per M tokens), fast (~3s per stage), good enough for 80% of cases |
| Sentinel (validation) | `claude-opus-4-6` | Expensive ($15/$75 per M tokens), but only runs once per prowl — catches voice drift, legal risk, citation errors |
| Fallback (on revision) | `claude-opus-4-6` | When prowl is wrong and Lane revises, the re-run uses Opus directly — accuracy matters more than speed after a failed prediction |

**Cost math per case (4 stages, typical flow):**

| Scenario | Sonnet Calls | Opus Calls | Est. Cost |
|----------|-------------|-----------|-----------|
| No prowl | 0 | 4 (one per stage) | ~$0.60 |
| Prowl, 100% promoted | 4 (prowl) + 4 (sentinel) | 4 (sentinel) | ~$0.72 |
| Prowl, 75% promoted | 4 (prowl) + 4 (sentinel) + 1 (re-run) | 5 | ~$0.80 |

Prowl adds ~$0.12-0.20 per case in exchange for eliminating wait time between stages. At Lane's billing rate, the time saved on a single case pays for months of API costs.

## Configuration

```env
# Enable/disable prowl
PROWL_ENABLED=true

# Model selection
PROWL_MODEL=claude-sonnet-4-6
SENTINEL_MODEL=claude-opus-4-6

# Minimum acceptance rate to trigger prowl (0.0-1.0)
PROWL_MIN_ACCEPTANCE=0.7

# Sentinel validation threshold (0-100)
SENTINEL_THRESHOLD=80

# Timeout: discard prowl after N minutes of no human action
PROWL_TIMEOUT_MINUTES=30

# Stages where prowl pauses (comma-separated)
# e.g., if Lane always revises drafts, pause before qa
PROWL_PAUSE_STAGES=

# Max prowl depth (how many stages ahead)
PROWL_MAX_DEPTH=2
```

## Files

| File | Purpose |
|------|---------|
| `server/services/prowl.ts` | Core engine — predict, execute, promote/discard |
| `server/services/sentinel.ts` | Dual-model validation gate |
| `server/services/pipelineMetrics.ts` | Signal framework — tracks everything |
| `server/routes/agents.ts` | Wired in: approve endpoint resolves prowl |

## Self-Improving Loop

The system gets better automatically:

1. **Acceptance rates update per stage.** If Lane always approves intake but frequently revises drafting, prowl becomes aggressive on intake and conservative on drafting.

2. **Sentinel threshold tunes itself.** If the sentinel passes prowls that Lane revises, the threshold goes up. If the sentinel rejects prowls that Lane would have approved, the threshold goes down. [FUTURE: automatic threshold adjustment]

3. **Model selection adapts.** If Sonnet prowl accuracy drops below 60% for a stage, that stage switches to Opus for prowl — slower but more accurate. [FUTURE: per-stage model routing]

4. **Cost tracking prevents runaway.** If prowl spend exceeds 30% of total API cost with low promotion rates, prowl auto-disables for that stage. [FUTURE: budget kill switch]

Every case Lane runs through BlackBar generates signal that makes the next case faster.

---

*Architecture designed 2 April 2026 — Renamed to SCG BlackBar branding 5 April 2026*
*Inspired by: CPU branch prediction, speculative execution in processor architecture*
*The bear prowls ahead.*
