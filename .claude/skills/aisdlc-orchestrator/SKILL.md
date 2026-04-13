---
name: aisdlc-orchestrator
description: >
  Master orchestrator for the AI-native Software Development Lifecycle (AISDLC).
  Routes work to phase-specific AISDLC skills and enforces the OODA loop
  (Observe → Orient → Decide → Act → Loop) across all phases. Use this skill
  whenever the user asks to "run the AISDLC," "start a new feature through the
  pipeline," "what phase are we in," or references the agentic SDLC workflow.
  Also triggers when the user mentions OODA, agentic development lifecycle,
  or asks to move work between AISDLC phases. This is the entry point — it
  delegates to phase skills (aisdlc-requirements, aisdlc-development, aisdlc-qa,
  aisdlc-enterprise-brain, aisdlc-governance, aisdlc-metrics). Even if the user
  jumps directly to a phase, consult this skill first to establish context and
  ensure the OODA loop is respected.
---

# AISDLC Orchestrator

## Scope

**Personal Projects Edition.** BlackBar, PLATINUM-BAR, Bloom Soft Co, and any
project where Caleb Swainston is sole developer and operator.

**Not for:** RefiJet, enterprise clients, or anything with compliance gates
(TILA/Reg Z, UDAAP, SOC 2). Those get the enterprise AISDLC variant.

---

## Purpose

Coordinate work across the seven AISDLC phases using the OODA loop paradigm.
This skill does NOT execute phase work — it routes to the correct phase skill,
tracks phase state, and enforces governance gates between phases.

---

## The OODA Loop — Core Paradigm

Every AISDLC phase operates as an OODA loop, not a linear pipeline:

| Step      | What the Agent Does                                         |
|-----------|-------------------------------------------------------------|
| **Observe** | Detect the trigger: new ticket, failed build, anomaly, PR   |
| **Orient**  | Marshal context via Enterprise Brain: RAG lookup, code history, architecture docs |
| **Decide**  | Formulate a plan with explicit reasoning                     |
| **Act**     | Execute the plan (code, test, config, doc)                   |
| **Loop**    | Verify outcome → if fail, re-enter Observe with new signal   |

The distinction from traditional SDLC: agents loop autonomously within a phase
until a quality gate passes or you intervene. You orchestrate; agents execute.

---

## Phase Map (7 Phases + Cross-Cutting)

```
Phase 1        Phase 2       Phase 3       Phase 4
Requirements → Development → QA          → Deploy
                                            ↓
Phase 7        Phase 6       Phase 5
Metrics      ← Operate     ← Governance

Cross-cutting: Enterprise Brain (all phases)
```

| Phase | Skill | Trigger | Output |
|-------|-------|---------|--------|
| 1. Requirements | `aisdlc-requirements` | New feature request, ambiguous ticket, schema change | Gherkin user stories, sequence diagrams, impact analysis |
| 2. Development | `aisdlc-development` | Approved requirement, scaffold request, legacy refactor | Production code, test stubs, reviewer-annotated PRs |
| 3. QA | `aisdlc-qa` | Code ready for validation, build failure, regression | Three-layer test suite (golden + adversarial), auto-healed builds |
| 4. Deploy | (predeploy gate script) | QA exit gate passes | Live artifact on Railway (or target platform) |
| 5. Governance | `aisdlc-governance` | Every phase boundary, deploy approval, budget check | 3-question gate pass/fail, budget enforcement |
| 6. Operate | (Phase 6 agents — Sentinel/Healer/Watchdog) | Deploy lands in UAT or production | Sentinel test reports, Healer PRs, Watchdog alerts |
| 7. Metrics | `aisdlc-metrics` | Post-deploy, monthly review, pipeline health check | 4 core KPIs + derived metrics |
| X. Enterprise Brain | `aisdlc-enterprise-brain` | Any phase Orient step needing context | Contextual retrieval from indexed knowledge |

---

## Phase Transition Rules

Each transition fires the Governance gate (3 questions: tests pass? cost under cap? you approve?).

| Transition | Exit Criteria |
|------------|---------------|
| **1 → 2** (Requirements → Development) | All user stories have Gherkin. Zero open ambiguities. You signed off. |
| **2 → 3** (Development → QA) | Reviewer Agent annotated PR. All Gherkin scenarios have test stubs. No unaddressed high-risk flags. `npm run lint` passes. |
| **3 → 4** (QA → Deploy) | All golden tests pass. Zero critical adversarial findings unaddressed. All auto-fixable failures resolved by Healer. Coverage meets threshold (60% statements for BlackBar). |
| **4 → 5** (Deploy → Governance) | Health check returns 200. No crash loops in first 60 seconds. |
| **5 → 6** (Governance → Operate) | You approve the deploy. |
| **6 → 7** (Operate → Metrics) | Operate agents report status (Sentinel/Healer/Watchdog). |
| **7 → 1** (Metrics → Requirements) | Metrics anomalies become new tickets. Closes the pipeline-level OODA loop. |

---

## Governance at Phase Boundaries (Personal Projects)

Three binary questions at every boundary:

| Question | How to check | Fail action |
|----------|-------------|-------------|
| Did tests pass? | `npm run test:golden` exit code | Block. Fix tests. |
| Is cost under cap? | Token spend < budget per task | Halt agent. Review spend. |
| Do you approve? | You look at the output | Revise or reject. |

Budget kill switch defaults:

| Parameter | Default |
|-----------|---------|
| Max OODA loops per task | 5 |
| Max token spend per agent run | $2.00 (Sonnet) |
| Max wall-clock time per agent | 10 min |

What governance is NOT for personal projects:
- No multi-approver chains
- No compliance committee
- No shadow AI prevention policy
- No SOC 2 audit trail
- No CISO sign-off

---

## Fast-Track Rules

Personal projects can accelerate phases when risk is low:

| Shortcut | When it applies | Tag |
|----------|----------------|-----|
| Skip Socratic loop | Feature is obvious, low-risk. Write Gherkin yourself. | `[FAST-TRACK]` |
| Skip UAT | v1 with no staging env. Push to main = deploy to production. | `[NO-UAT]` |
| Merge Phases 3+4 | Golden tests pass locally → deploy immediately. | `[SPEED-RUN]` |

**Rule:** Tag fast-tracks so downstream phases know what was skipped. Phase 3 treats `[FAST-TRACK]` requirements with extra adversarial scrutiny.

---

## Phase 4: Deploy

**Pre-deploy gate:** `npm run predeploy`

Runs the full OODA sequence:
1. OBSERVE — lint + typecheck
2. ORIENT — golden tests
3. DECIDE — adversarial delta (informational)
4. ACT — build + artifact verification

**Deploy flow:**
```
predeploy passes → git push origin main → Railway auto-builds → Health check: GET /api/health → If 200 → live
```

Required env vars: DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY, ALLOWED_ORIGINS, NODE_ENV, PORT (auto).

---

## Phase 6: Operate (Self-Healing)

Three runtime agents that monitor, test, detect, fix, and re-deploy autonomously:

| Agent | Purpose | Trigger | Safety |
|-------|---------|---------|--------|
| **Sentinel** | Continuous adversarial testing against live UAT endpoints | Every deploy to UAT, or cron (every 6h) | Read-only — never modifies code |
| **Healer** | Autonomous repair — commits to `healer/fix-*` branch, opens PR | Sentinel reports failure | Never commits to main. Never weakens tests. Max 2 attempts then escalate. |
| **Watchdog** | Runtime health monitoring — polls health endpoint, error rates | Continuous (every 5 min) | Alert only — never auto-deploys |

Your approval is always required for Healer PRs (Governance gate).

---

## When to Use

- User says "start AISDLC for [feature]" → Begin at Phase 1
- User says "where are we on [feature]" → Report current phase + blockers
- User says "move to next phase" → Validate gate conditions, advance or block
- User references a specific phase → Route to that phase skill but log context here
- User asks for AISDLC status dashboard → Invoke `aisdlc-metrics`

## When NOT to Use

- One-off code questions with no lifecycle context
- Pure compliance review (use PCE v2.0 directly)
- Brand/styling work (use brand skills directly)

---

## Reference

- **Master Process:** `AISDLC_MASTER_PROCESS.md` (canonical — this skill implements it)
- **CI/CD Integration:** `npm run predeploy` wraps the full OODA gate sequence
- **Test Architecture:** `webapp/tests/README.md` (coverage map + traceability matrix)
- **Pre-deploy Script:** `webapp/scripts/pre-deploy.sh`
