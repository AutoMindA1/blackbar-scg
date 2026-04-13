# AISDLC Master Process v1.0

## Personal Projects Edition

**Scope:** BlackBar, PLATINUM-BAR, Bloom Soft Co, and any personal project where Caleb Swainston is sole developer and operator.

**Not for:** RefiJet, enterprise clients, or anything with compliance gates (TILA/Reg Z, UDAAP, SOC 2). Those get the enterprise AISDLC variant.

---

## The Core Loop

Every phase runs an internal OODA loop. Governance fires at every phase boundary. Enterprise Brain feeds the Orient step in every phase.

```
Phase 1        Phase 2       Phase 3       Phase 4
Requirements → Development → QA          → Deploy
                                            ↓
Phase 7        Phase 6       Phase 5
Metrics      ← Operate     ← Governance

Cross-cutting: Enterprise Brain (all phases)
```

**The distinction from traditional SDLC:** Agents loop autonomously within a phase until a quality gate passes or you intervene. You orchestrate; agents execute.

---

## Phase 1: Requirements

**Skill:** `aisdlc-requirements`

**Purpose:** Kill ambiguity before a single line of code is written.

**Agent:** Socratic Requirements Agent

**OODA:**

| Step | Action |
|------|--------|
| Observe | Ingest feature request, ticket, or idea |
| Orient | Query Enterprise Brain for prior art, constraints, existing patterns |
| Decide | Identify ambiguities, contradictions, unstated assumptions |
| Act | Socratic dialogue — pointed questions, not open-ended. Output: Gherkin scenarios + sequence diagrams |
| Loop | Repeat until ambiguity count = 0 |

**Outputs:**
- User stories with Gherkin acceptance criteria (Given/When/Then)
- Sequence diagrams (Mermaid)
- Ambiguity log with resolutions

**Exit gate → Phase 2:**
- All user stories have Gherkin
- Zero open ambiguities
- You signed off

**Personal project shortcut:** If the feature is obvious and low-risk, write the Gherkin yourself and skip the Socratic loop. Tag it `[FAST-TRACK]` so Phase 3 knows there was no adversarial requirements pass.

---

## Phase 2: Development

**Skill:** `aisdlc-development`

**Purpose:** Agents handle the 80% (config, boilerplate, scaffold). You handle the 20% (judgment, business logic).

**Agents:**
- **Scaffolding Agent** — generates folder structure, API contracts, test stubs from Gherkin
- **Legacy Archeologist** — maps undocumented code before refactoring
- **Reviewer Agent** — annotates PRs with logic conflicts, not just style

**OODA:**

| Step | Action |
|------|--------|
| Observe | Receive approved Gherkin from Phase 1 |
| Orient | Query Enterprise Brain for approved patterns, naming conventions, stack config |
| Decide | Select template, map spec to scaffold |
| Act | Generate scaffold with test stubs for each Gherkin scenario |
| Loop | Validate scaffold against project conventions → fix → re-validate |

**Outputs:**
- Production code
- Test stubs (one per Gherkin scenario, matching `us{XX}-*.test.ts` naming)
- PR with Reviewer Agent annotations

**Exit gate → Phase 3:**
- Reviewer Agent has annotated the PR
- All Gherkin scenarios have corresponding test stubs
- No unaddressed high-risk flags
- `npm run lint` passes

**Key integration:** Phase 2 Scaffolding Agent reads Phase 1 Gherkin and generates test stubs in `tests/golden/` using the `US-XX / Scenario N` naming convention. This is the bridge — requirements become tests before code is even written.

---

## Phase 3: QA

**Skill:** `aisdlc-qa`

**Purpose:** Agents are adversarial by design. Humans default to happy path. This phase generates tests designed to break the code, then heals what breaks.

**Agents:**
- **Adversarial Agent** — generates attack vectors: boundary, injection, type confusion, concurrency, state
- **Healer Agent** — auto-fixes recoverable failures, escalates the rest
- **Synthetic Data Agent** — generates realistic test data without real PII

**OODA:**

| Step | Action |
|------|--------|
| Observe | `npm run lint && tsc --noEmit` — static signals |
| Orient | `npm run test:golden` — compare against regression baseline |
| Decide | `npm run test:adversarial` — is security posture improving or degrading? |
| Act | Block merge if golden fails. Flag if adversarial got worse. |
| Loop | Fixed adversarial tests graduate to golden suite |

**Three test layers:**

| Layer | Source | Direction | Question |
|-------|--------|-----------|----------|
| Golden (code-derived) | Backend audit | Bottom-up | Does what exists actually work? |
| Golden (Gherkin-derived) | Phase 1 PRD | Top-down | Does the code meet requirements? |
| Adversarial | OWASP + threat model | Attack surface | Can it be broken? |

**Healer Agent decision matrix:**

| Failure Pattern | Action |
|-----------------|--------|
| Selector renamed + recent commit | Auto-fix, re-run |
| Assertion mismatch + no recent changes | Escalate to you |
| Timeout on external call | Quarantine + mock |
| Import not found + dep update | Update import, re-run |

**Healer safety rules:**
- Never weaken an assertion to make it pass
- Never skip or disable a test
- Always re-run the FULL suite after a fix
- If auto-fix fails twice, stop and escalate

**Exit gate → Phase 4:**
- All golden tests pass
- Zero critical adversarial findings unaddressed
- All auto-fixable failures resolved by Healer
- Coverage meets threshold (60% statements for BlackBar, increase over time)

---

## Phase 4: Deploy

**Purpose:** Get the build from laptop to Railway with a single gate.

**Pre-deploy gate:** `npm run predeploy`

This runs the full OODA sequence:
1. OBSERVE — lint + typecheck
2. ORIENT — golden tests
3. DECIDE — adversarial delta (informational)
4. ACT — build + artifact verification

**Deploy flow:**

```
predeploy passes
    ↓
git push origin main
    ↓
Railway auto-builds (railway.toml)
    ↓
Health check: GET /api/health
    ↓
If 200 → live
If fail → Railway auto-rollback (restartPolicyType: ON_FAILURE, max 3)
```

**Required env vars:**

| Var | Required | Notes |
|-----|----------|-------|
| DATABASE_URL | Yes | Railway Postgres internal URL |
| JWT_SECRET | Yes | Random 64+ chars |
| ANTHROPIC_API_KEY | Yes | For agent pipeline |
| ALLOWED_ORIGINS | Yes (prod) | Railway public domain |
| NODE_ENV | Yes (prod) | `production` |
| PORT | Auto | Railway sets this |

**Exit gate → Phase 5:**
- Health check returns 200
- No crash loops in first 60 seconds

**Personal project shortcut:** No staging environment required for v1. Push to main = deploy to production. When UAT environment exists (see Phase 6), the flow becomes: push → deploy to UAT → Operate agents test → Governance gate → promote to production.

---

## Phase 5: Governance

**Purpose:** Three questions. That's it.

For personal projects, governance is not a committee or a checklist matrix. It's three binary questions at every phase boundary:

| Question | How to check | Fail action |
|----------|-------------|-------------|
| Did tests pass? | `npm run test:golden` exit code | Block. Fix tests. |
| Is cost under cap? | Token spend < budget per task | Halt agent. Review spend. |
| Do you approve? | You look at the output | Revise or reject. |

**Budget kill switch (personal projects):**

| Parameter | Default |
|-----------|---------|
| Max OODA loops per task | 5 |
| Max token spend per agent run | $2.00 (Sonnet) |
| Max wall-clock time per agent | 10 min |

If any limit is hit: halt, snapshot state, notify. Resume after you review.

**When governance fires:**
- Phase 1 → 2: You approve requirements
- Phase 2 → 3: Reviewer Agent says no high-risk flags
- Phase 3 → 4: Golden tests pass
- Phase 4 → 5: Health check passes
- Phase 5 → 6: You approve deploy
- Phase 6 → 7: Operate agents report status
- Phase 7 → 1: Metrics anomalies become new tickets

**What governance is NOT for personal projects:**
- No multi-approver chains
- No compliance committee
- No shadow AI prevention policy
- No SOC 2 audit trail
- No CISO sign-off

---

## Phase 6: Operate (Self-Healing)

**Purpose:** Live agents that monitor, test, detect, fix, and re-deploy — autonomously, in a safe environment.

This is the new capability. This is where agents stop being build-time tools and become runtime operators.

### Architecture

```
┌─────────────────────────────────────────────────┐
│                  UAT Environment                 │
│              (Railway staging service)            │
│                                                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │  Sentinel  │  │   Healer  │  │  Watchdog  │    │
│  │   Agent    │  │   Agent   │  │   Agent    │    │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘    │
│        │              │              │            │
│        ▼              ▼              ▼            │
│  ┌──────────────────────────────────────────┐    │
│  │          BlackBar / PLATINUM-BAR          │    │
│  │           (UAT deployment)                │    │
│  └──────────────────────────────────────────┘    │
│                                                   │
└─────────────────────────────────────────────────┘
         │
         ▼ (Governance gate: tests pass + you approve)
┌─────────────────────────────────────────────────┐
│              Production Environment              │
│           (Railway production service)            │
└─────────────────────────────────────────────────┘
```

### Three Operate Agents

**1. Sentinel Agent — Continuous Testing**

Runs adversarial tests against live UAT endpoints on a schedule (every deploy, or cron).

| Step | Action |
|------|--------|
| Observe | New deploy lands in UAT |
| Orient | Load golden + adversarial test suites |
| Decide | Run full suite against live API (not mocks) |
| Act | Report: what passed, what failed, what's new |
| Loop | If failures detected → trigger Healer |

**Concrete implementation:** A scheduled GitHub Action (or Railway cron job) that:
1. Checks out the repo
2. Runs `npm run test:golden` against UAT API URL (not localhost)
3. Runs a smoke test suite (health, auth, case CRUD) against live endpoints
4. Posts results to a Slack channel or GitHub Issue

**2. Healer Agent — Autonomous Repair**

When Sentinel finds a failure, Healer attempts to fix it.

| Step | Action |
|------|--------|
| Observe | Sentinel reports failure with error details |
| Orient | Cross-reference: recent commits, known patterns, dependency changes |
| Decide | Classify: auto-fixable, needs investigation, flaky |
| Act | Auto-fix → commit to branch → run tests → open PR if green |
| Loop | If fix fails twice → stop, open issue, tag you |

**Safety rails:**
- Healer commits to a `healer/fix-*` branch, never main
- PR requires your approval (Governance gate)
- Healer never weakens tests
- Healer never modifies Governance or Deploy configs
- Max 2 fix attempts per failure, then escalate

**3. Watchdog Agent — Runtime Health**

Monitors production for anomalies that tests can't catch.

| Step | Action |
|------|--------|
| Observe | Poll health endpoint, check error rates, monitor response times |
| Orient | Compare against baseline (last 24h average) |
| Decide | Is this an anomaly or normal variance? |
| Act | If anomaly: alert you via Slack. If critical: trigger rollback. |
| Loop | Continuous — every 5 minutes |

**Concrete implementation:** A simple health check script that:
1. `GET /api/health` — expect 200 in < 2s
2. `POST /api/auth/login` with test credentials — expect 200
3. Check Railway metrics API for error rate spike
4. Alert threshold: 3 consecutive failures or error rate > 5%

### UAT Environment Setup

Railway supports multiple services per project. UAT is a second service in "airy-creativity":

| Config | Production | UAT |
|--------|-----------|-----|
| Railway service | `blackbar-production` | `blackbar-uat` |
| Branch | `main` | `develop` |
| DATABASE_URL | Production Postgres | Separate UAT Postgres (or same DB, different schema) |
| ALLOWED_ORIGINS | Production domain | UAT domain |
| Auto-deploy | On push to main | On push to develop |

**Flow:** Feature branch → PR → merge to `develop` → UAT deploy → Sentinel tests → Healer fixes → Governance gate (you) → merge to `main` → Production deploy.

---

## Phase 7: Metrics

**Skill:** `aisdlc-metrics`

**Purpose:** Measure whether the pipeline is getting better or worse. Four numbers.

### Core Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Decision Turn Count | OODA loops per task (lower = better) | < 5 avg |
| Recovery Rate | % of failures Healer auto-fixes | > 60% |
| Tool Selection Accuracy | Did the agent pick the right tool first? | > 85% |
| Context Utilization | % of tasks using Enterprise Brain | > 60% |

### Derived Metrics

| Metric | Formula | Purpose |
|--------|---------|---------|
| Autonomy Index | Tasks without human intervention / Total tasks | Overall pipeline autonomy |
| Gate Pass Rate | First-attempt phase transitions / Total transitions | Upstream quality |
| Cost per Task | Token spend / Tasks completed | Efficiency trend |
| Adversarial Closure Rate | Adversarial tests fixed this sprint / Total adversarial failures | Security debt velocity |

### Feedback Loop

Metrics close the OODA loop at the pipeline level:

- Low Recovery Rate → investigate failure patterns → new Phase 1 tickets
- Low Context Utilization → Enterprise Brain gaps → index new sources
- High Turn Count → prompt/skill refinement needed
- Rising Adversarial failures → new attack surface → Phase 3 attention

**Personal project cadence:** Monthly review, not sprint retro. Track in a simple dashboard (HTML artifact or spreadsheet), not a stakeholder deck.

---

## Enterprise Brain (Cross-Cutting)

**Skill:** `aisdlc-enterprise-brain`

**Purpose:** Agents are only as good as their context. The Brain makes them knowledgeable, not just smart.

**For BlackBar specifically:**

| Knowledge Domain | Source | Used By |
|-----------------|--------|---------|
| Forensic domain | `ENTERPRISE_BRAIN.md` (15 sections) | Research + Drafting + QA agents |
| Voice profile | `VOICE.md` | Drafting + QA agents |
| Attack patterns | ATK-01 through ATK-10 | Research agent |
| Case law | Brain Section 8 (jurisdiction tables) | Research agent |
| Architecture | `ARCHITECTURE_AUDIT_v1.1.md` | Phase 2 Development |
| Test coverage | `tests/README.md` coverage map | Phase 3 QA |

**Query patterns:**
- "What attack pattern applies?" → Search Brain Sections 3-4
- "What's Lane's voice rule for this?" → Search VOICE.md
- "Have we seen this failure before?" → Search test suite + agent logs
- "What's the architecture pattern?" → Search ARCHITECTURE_AUDIT

---

## CI/CD Integration

The full pipeline as a single command sequence:

```bash
# Phase 3 QA gate (local)
npm run lint && tsc --noEmit && npm run test:golden

# Phase 4 Deploy gate (local)
npm run predeploy

# Phase 4 Deploy (trigger)
git push origin main          # production
git push origin develop       # UAT

# Phase 6 Operate (automated — GitHub Actions or Railway cron)
# Sentinel runs tests against live UAT
# Healer opens PRs for auto-fixable failures
# Watchdog monitors health
```

### GitHub Actions Skeleton (Phase 6 Sentinel)

```yaml
name: Sentinel — UAT Health
on:
  push:
    branches: [develop]
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  sentinel:
    runs-on: ubuntu-latest
    env:
      UAT_URL: ${{ secrets.UAT_URL }}
      JWT_SECRET: ${{ secrets.JWT_SECRET }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd webapp && npm ci
      - run: cd webapp && npm run test:golden
      - name: Smoke test UAT
        run: |
          curl -sf "$UAT_URL/api/health" || exit 1
          echo "UAT health check passed"
      - name: Alert on failure
        if: failure()
        run: echo "Sentinel detected failure — trigger Healer"
        # TODO: Trigger Healer Agent via webhook or dispatch event
```

---

## How to Read This Document

| If you need... | Go to... |
|----------------|----------|
| "What phase am I in?" | Phase Map diagram at top |
| "Can I skip a phase?" | Each phase has a [FAST-TRACK] shortcut where applicable |
| "What tests do I run?" | Phase 3 QA → Three test layers table |
| "How do I deploy?" | Phase 4 Deploy → `npm run predeploy` |
| "What do agents do at runtime?" | Phase 6 Operate → Three Operate Agents |
| "Is the pipeline working?" | Phase 7 Metrics → Four core metrics |
| "What context do agents need?" | Enterprise Brain → knowledge domain table |

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 12 April 2026 | Initial — 7 phases, personal projects scope, self-healing architecture |
