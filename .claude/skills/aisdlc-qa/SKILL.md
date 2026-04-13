---
name: aisdlc-qa
description: >
  AISDLC Phase 3 — Autonomous Quality Assurance. Implements the Adversarial
  Agent and Healer Agent patterns. Use this skill when code needs testing
  beyond happy path, a build has failed and needs auto-diagnosis, test suites
  need generation from acceptance criteria, or synthetic test data is required.
  Triggers on: "generate tests," "adversarial testing," "break this code,"
  "auto-fix the build," "heal the pipeline," "generate synthetic data,"
  "fuzz testing," or any QA task within the AISDLC pipeline. Also triggers on
  build failures, test failures, and regression detection. Consult
  aisdlc-orchestrator for phase context.
---

# AISDLC Phase 3: Autonomous Quality Assurance

## Scope

**Personal Projects Edition.** BlackBar, PLATINUM-BAR, Bloom Soft Co.

---

## Purpose

Humans default to happy path testing. Agents are programmed to be adversarial.
This phase generates tests designed to break the code, creates privacy-safe
synthetic data, and auto-heals recoverable build failures — the highest
immediate-ROI phase of the AISDLC.

---

## OODA Loop Integration

Phase 3 QA maps directly to the OODA loop. Each step is a concrete command:

| OODA Step | QA Action | Command | Gate |
|-----------|-----------|---------|------|
| **Observe** | Lint + typecheck (cheapest signal first) | `npm run lint && tsc --noEmit` | Fail = block |
| **Orient** | Golden tests (regression baseline) | `npm run test:golden` | Fail = block merge |
| **Decide** | Adversarial tests (security posture) | `npm run test:adversarial` | Fail = flag (informational, not blocking for personal projects) |
| **Act** | Build + artifact verification | `npm run build` | Fail = block deploy |
| **Loop** | Fixed adversarial tests graduate to golden suite | Manual promotion | Improves baseline over time |

**Key insight:** Lint is OBSERVE because it's the cheapest, fastest signal. If lint fails, nothing else matters — fix it before burning cycles on tests.

---

## Three Test Layers

| Layer | Source | Direction | Question | Suite |
|-------|--------|-----------|----------|-------|
| **Golden (code-derived)** | Backend audit of existing code | Bottom-up | Does what exists actually work? | `tests/golden/*.test.ts` |
| **Golden (Gherkin-derived)** | Phase 1 PRD user stories | Top-down | Does the code meet requirements? | `tests/golden/us*.test.ts` |
| **Adversarial** | OWASP + threat model + agent attack vectors | Attack surface | Can it be broken? | `tests/adversarial/*.test.ts` |

**Golden tests MUST pass** — they are the regression gate. Failures block merge.

**Adversarial tests WILL fail** — they are the security debt scoreboard. Failures document known vulnerabilities. When you fix a vulnerability, the corresponding adversarial test graduates to the golden suite.

---

## Agent Patterns

### 1. Adversarial Agent

**Trigger:** Code passes Phase 2 review, acceptance criteria available.

**OODA Loop:**
1. **Observe:** Ingest acceptance criteria + code under test.
2. **Orient:** Identify input surfaces:
   - API endpoints (params, headers, body)
   - File uploads (type, size, content)
   - Database constraints
   - Auth/session boundaries
3. **Decide:** Generate attack vectors for each input:
   - Boundary values: -1, 0, MAX_INT, MAX+1
   - Type confusion: null, undefined, empty string, emoji, Unicode
   - Injection: SQL, XSS, command injection patterns
   - Concurrency: race conditions, duplicate submissions
   - State: out-of-order operations, expired sessions
4. **Act:** Generate test suite organized by attack category.
5. **Loop:** Run tests → for each failure, classify:
   - **True bug** → file issue
   - **Missing validation** → file issue + suggest fix
   - **Test error** → fix test and re-run

**Test Suite Structure:**
```
webapp/tests/
├── golden/
│   ├── auth.test.ts              # Code-derived: JWT, bcrypt, login schema
│   ├── cases.test.ts             # Code-derived: CRUD, stage transitions
│   ├── documents.test.ts         # Code-derived: file validation, uploads
│   ├── reports.test.ts           # Code-derived: sanitization, export
│   ├── agents.test.ts            # Code-derived: SSE, pipeline, approval
│   ├── us01-document-checkin.test.ts   # Gherkin-derived: US-01
│   ├── us02-pipeline-execution.test.ts # Gherkin-derived: US-02
│   ├── us03-human-review.test.ts       # Gherkin-derived: US-03
│   ├── us04-multi-tenant.test.ts       # Gherkin-derived: US-04
│   └── us05-security-hardening.test.ts # Gherkin-derived: US-05
├── adversarial/
│   ├── boundary/          # Edge values
│   ├── type-confusion/    # Wrong types, null, unicode
│   ├── injection/         # SQL, XSS, command
│   ├── concurrency/       # Race conditions
│   └── state/             # Out-of-order, expired
└── README.md              # Coverage map + traceability matrix
```

### 2. Healer Agent

**Trigger:** Build failure, test failure in CI/CD pipeline.

**OODA Loop:**
1. **Observe:** Parse failure log — identify the failing assertion or error.
2. **Orient:** Cross-reference against:
   - Recent commits (what changed?)
   - Known failure patterns
   - Dependency updates
3. **Decide:** Classify the failure.
4. **Act:** Apply fix or escalate.
5. **Loop:** Re-run full suite after fix → if new failure, re-enter Observe.

**Healer Decision Matrix:**

| Failure Pattern | Action |
|-----------------|--------|
| Selector renamed + recent commit | Auto-fix, re-run |
| Assertion mismatch + no recent changes | Escalate to you |
| Timeout on external call | Quarantine + mock |
| Import not found + dep update | Update import, re-run |
| Security scan finding | Escalate to you |

**Healer Safety Rules (NEVER VIOLATE):**
- Never weaken an assertion to make it pass
- Never skip or disable a test
- Always re-run the FULL suite after a fix (not just the fixed test)
- If auto-fix fails twice, stop and escalate
- Healer commits to `healer/fix-*` branch, never main
- Your approval required for any Healer PR

### 3. Synthetic Data Agent

**Trigger:** Tests need realistic data but production data is restricted.

**Rules:**
- Zero real PII — all names, SSNs, account numbers are synthetic
- Preserve referential integrity across related entities
- Document the seed and generation parameters for reproducibility
- For BlackBar: generate synthetic case data (parties, incidents, findings)
  matching the schema in `prisma/schema.prisma`

---

## Phase Exit Criteria

All must be true before advancing to Phase 4 (Deploy):

- [ ] All golden tests pass (`npm run test:golden` exit code 0)
- [ ] Zero critical adversarial findings unaddressed
- [ ] All auto-fixable failures resolved by Healer
- [ ] Coverage meets threshold (60% statements for BlackBar, increase over time)
- [ ] `npm run lint` passes
- [ ] `tsc --noEmit` passes

**Shortcut:** `npm run predeploy` wraps the full OODA gate sequence
(lint → typecheck → golden → build → artifact check).

---

## Gherkin → Test Bridge

Phase 1 Gherkin scenarios create Phase 3 golden tests using this convention:

| PRD | Gherkin Scenario | Test File | Describe Block |
|-----|-----------------|-----------|----------------|
| US-01 | Scenario 1: Successful intake | `us01-document-checkin.test.ts` | `US-01 / Scenario 1` |
| US-02 | Scenario 1: Full pipeline | `us02-pipeline-execution.test.ts` | `US-02 / Scenario 1` |

Each Gherkin `Given/When/Then` maps to `arrange/act/assert` in the test.
The `US-XX / Scenario N` naming provides traceability back to requirements.

---

## Integration Points

- **Upstream:** `aisdlc-development` (reviewed code)
- **Downstream:** Phase 4 Deploy (predeploy gate)
- **Cross-cutting:** `aisdlc-enterprise-brain` (known failure patterns)
- **Governance:** `aisdlc-governance` (3-question gate at phase exit)

---

## Reference

- **Master Process:** `AISDLC_MASTER_PROCESS.md` (canonical)
- **Test Coverage Map:** `webapp/tests/README.md`
- **Pre-deploy Script:** `webapp/scripts/pre-deploy.sh`
