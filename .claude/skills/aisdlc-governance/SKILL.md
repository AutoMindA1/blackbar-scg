---
name: aisdlc-governance
description: >
  AISDLC Phase 5 — Governance, Guardrails, and Human-in-the-Loop. Implements
  sandboxing, budget kill switches, and human gate routing for the agentic SDLC.
  Use this skill at every phase transition, before any merge-to-main, before any
  production deployment, or when token/cost budgets need enforcement. Triggers on:
  "governance check," "human gate," "can we merge," "deploy approval," "budget
  check," "sandbox validation," "compliance gate," or any request that involves
  risk assessment before an irreversible action. Also triggers when another
  AISDLC skill flags a High Risk item or compliance-adjacent output. This skill
  is invoked BY other skills at phase boundaries — it also triggers standalone
  for governance policy questions.
---

# AISDLC Phase 5: Governance (Personal Projects Edition)

## Scope

**Personal Projects.** BlackBar, PLATINUM-BAR, Bloom Soft Co, and any project
where Caleb Swainston is sole developer and operator.

For RefiJet/enterprise governance (multi-approver chains, SOC 2 audit trail,
compliance committee, CISO sign-off), use the enterprise AISDLC variant.

---

## Purpose

Three questions. That's it.

For personal projects, governance is not a committee or a checklist matrix.
It's three binary questions at every phase boundary:

| Question | How to check | Fail action |
|----------|-------------|-------------|
| **Did tests pass?** | `npm run test:golden` exit code | Block. Fix tests. |
| **Is cost under cap?** | Token spend < budget per task | Halt agent. Review spend. |
| **Do you approve?** | You look at the output | Revise or reject. |

---

## Budget Kill Switch

Every agentic loop has hard cost and retry limits.

| Parameter | Default | Escalation |
|-----------|---------|------------|
| Max OODA loops per task | 5 | After 5: halt, snapshot state, notify |
| Max token spend per agent run | $2.00 (Sonnet) | After limit: halt + notify |
| Max wall-clock time per agent | 10 min | After timeout: halt + snapshot |

**Enforcement rules:**
- Agent must check budget before each Act step
- If budget exceeded mid-action, complete current atomic operation then halt
- Never silently consume budget — log every token/API call
- Budget overruns are reviewed — they inform future budget allocation
- If any limit is hit: halt, snapshot state, notify. Resume after you review.

---

## When Governance Fires

| Transition | Gate |
|------------|------|
| Phase 1 → 2 | You approve requirements |
| Phase 2 → 3 | Reviewer Agent says no high-risk flags |
| Phase 3 → 4 | Golden tests pass |
| Phase 4 → 5 | Health check passes |
| Phase 5 → 6 | You approve deploy |
| Phase 6 → 7 | Operate agents report status |
| Phase 7 → 1 | Metrics anomalies become new tickets |

---

## Human Gate Rules

| Action | Gate Type | Notes |
|--------|-----------|-------|
| Merge to main | **REQUIRED** — always you | Push to main = deploy to production |
| Healer Agent PR | **REQUIRED** — always you | Healer commits to `healer/fix-*` branch, never main |
| Schema migration | **REQUIRED** — always you | `npx prisma migrate dev --name <desc>` |
| Deploy to production | **REQUIRED** — always you | `git push origin main` after predeploy passes |
| Deploy to UAT | **AUTO** — if tests pass | `git push origin develop` (when UAT exists) |
| Test auto-heal | **AUTO** — no gate if green after fix | Logged for metrics |

---

## What Governance is NOT (Personal Projects)

- No multi-approver chains
- No compliance committee
- No shadow AI prevention policy
- No SOC 2 audit trail
- No CISO sign-off
- No PCE v2.0 compliance checks (those are RefiJet-only)
- No sandbox/ephemeral container requirement (local dev is fine)

---

## Phase Transition Gate Checklist

Run this at every phase boundary:

```markdown
## Gate Check: [Phase X] → [Phase Y]

- [ ] Phase exit criteria met (see source phase skill)
- [ ] Token/cost budget within cap
- [ ] You approve the output

If blocked:
- [ ] Fix the failing gate
- [ ] Re-run the check
- [ ] Do not bypass — fix upstream
```

---

## Hotfix Bypass

Urgent hotfixes can skip intermediate phases:

1. Write the fix
2. Run `npm run test:golden` — must pass
3. `git push origin main`
4. Document the bypass as `[HOTFIX-BYPASS]` in commit message
5. Retroactively file a ticket for any skipped QA/adversarial coverage

Never bypass the golden test gate, even for hotfixes.

---

## Edge Cases

1. **Budget exceeded but task is 90% complete:** Complete the atomic operation
   in progress, halt, snapshot state, review. Do not restart from scratch —
   resume after budget review.
2. **Agent disagrees with human gate decision:** Log the disagreement with
   rationale. Your decision is final.
3. **Tests pass locally but fail on Railway:** Debug the environment delta.
   Common causes: env var missing, Postgres version mismatch, timezone.
   Do not deploy until both pass.

---

## Integration Points

- **All phases** invoke this skill at exit boundaries
- **aisdlc-enterprise-brain** provides context for Orient step
- **aisdlc-metrics** consumes gate pass/fail data for KPI tracking (Gate Pass Rate)
- **aisdlc-orchestrator** routes to this skill at every phase transition

---

## Reference

- **Master Process:** `AISDLC_MASTER_PROCESS.md` (canonical)
- **Pre-deploy gate:** `webapp/scripts/pre-deploy.sh` (Phase 3→4 automated gate)
