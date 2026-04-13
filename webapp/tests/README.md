# BlackBar / PLATINUM-BAR Test Suite

## Setup

```bash
cd webapp
npm install --save-dev vitest @vitest/coverage-v8
```

## Commands

| Command | What it does |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Watch mode (re-run on change) |
| `npm run test:coverage` | Run with V8 coverage report |
| `npm run test:golden` | Golden tests only (must-pass regression) |
| `npm run test:adversarial` | Adversarial tests only (security audit) |

## Test Structure

```
tests/
├── helpers/
│   ├── setup.ts                       # Global env (JWT_SECRET, NODE_ENV)
│   └── mocks.ts                       # Mock Prisma, Express req/res, synthetic data
├── golden/                            # HARD ASSERTIONS — must pass every commit
│   ├── auth.test.ts                   # JWT lifecycle, bcrypt, login schema
│   ├── cases.test.ts                  # CRUD, Zod schemas, stage transitions
│   ├── documents.test.ts              # File validation, size limits, page heuristic
│   ├── reports.test.ts                # Sanitizer basics, versioning, export HTML
│   ├── agents.test.ts                 # Stage validation, SSE, QA scorecard, approve flow
│   ├── us01-document-checkin.test.ts  # Gherkin: FT-01 (3 scenarios)
│   ├── us02-pipeline-execution.test.ts # Gherkin: FT-02 (2 scenarios)
│   ├── us03-human-review.test.ts      # Gherkin: FT-03 (3 scenarios)
│   ├── us04-multi-tenant.test.ts      # Gherkin: FT-04 (3 scenarios)
│   └── us05-security-hardening.test.ts # Gherkin: FT-05 (3 scenarios)
└── adversarial/                       # SECURITY AUDIT — documents known vulnerabilities
    ├── xss-sanitizer.test.ts          # 30+ OWASP XSS evasion vectors
    ├── input-boundary.test.ts         # Boundary values, type confusion, injection
    ├── agent-pipeline.test.ts         # Regex false positives, truncation, parser edge cases
    └── file-upload.test.ts            # Magic bytes, path traversal, TOCTOU race condition
```

## Golden vs Adversarial

**Golden tests** = hard regression gate. Every test must pass. Block merge if any fail.

**Adversarial tests** = security audit documentation. Many tests are *expected to fail* because they document known vulnerabilities. These exist to:
1. Prove the vulnerability is real (not theoretical)
2. Auto-pass when the fix lands (test becomes regression guard)
3. Track audit findings in code, not just docs

## Coverage Map — Audit Findings

| Audit Finding | Test File | Status |
|--------------|-----------|--------|
| XSS sanitizer bypass (Mythos Chain 3) | `adversarial/xss-sanitizer.test.ts` | Documents gap — many expected failures |
| No magic-byte validation | `adversarial/file-upload.test.ts` | Documents gap |
| Finding regex false positives | `adversarial/agent-pipeline.test.ts` | Documents bug |
| 10K char truncation | `adversarial/agent-pipeline.test.ts` | Documents data loss |
| QA scorecard parser edge cases | `adversarial/agent-pipeline.test.ts` | Covered |
| Null byte / RTL override in inputs | `adversarial/input-boundary.test.ts` | Documents gap |
| TOCTOU race on document count | `adversarial/file-upload.test.ts` | Documents gap |
| Page count heuristic inaccuracy | `golden/documents.test.ts` | Documented |
| No access control on GET /api/cases | `golden/cases.test.ts` | Documented |
| No backward stage transition guard | `golden/cases.test.ts` | Documented |
| Rate limit per IP not per user | `golden/agents.test.ts` | Documented |
| Mariz still in signoff template | `golden/reports.test.ts` | Not yet — fix in PLATINUM-BAR |
| Puppeteer --no-sandbox | N/A | Architecture issue — test won't help |
| No JWT refresh/revocation | `golden/auth.test.ts` | Token lifecycle tested |

## Gherkin Traceability Matrix — PRD → Test

Every Gherkin scenario from PLATINUM_BAR_PHASE1_PRD.md maps 1:1 to a test describe block.

| PRD Feature | Scenario | Test File | Describe Block |
|-------------|----------|-----------|---------------|
| **US-01: Document Check-In** | Successful case creation with document upload | `us01-document-checkin.test.ts` | `US-01 / Scenario 1` |
| | Invalid file upload (not a real PDF) | `us01-document-checkin.test.ts` | `US-01 / Scenario 2` |
| | Case creation with minimal fields | `us01-document-checkin.test.ts` | `US-01 / Scenario 3` |
| **US-02: Pipeline Execution** | Full pipeline success | `us02-pipeline-execution.test.ts` | `US-02 / Scenario 1` |
| | QA score below threshold triggers auto-revision | `us02-pipeline-execution.test.ts` | `US-02 / Scenario 2` |
| **US-03: Human Review** | Lane approves the report | `us03-human-review.test.ts` | `US-03 / Scenario 1` |
| | Lane requests a revision | `us03-human-review.test.ts` | `US-03 / Scenario 2` |
| | Lane rejects the report | `us03-human-review.test.ts` | `US-03 / Scenario 3` |
| **US-04: Multi-Tenant** | Attorney cannot see another attorney's cases | `us04-multi-tenant.test.ts` | `US-04 / Scenario 1` |
| | Tenant middleware enforces scoping | `us04-multi-tenant.test.ts` | `US-04 / Scenario 2` |
| | Superadmin can see all tenants | `us04-multi-tenant.test.ts` | `US-04 / Scenario 3` |
| **US-05: Security Hardening** | Malicious PDF upload blocked | `us05-security-hardening.test.ts` | `US-05 / Scenario 1` |
| | XSS attempt in report content blocked | `us05-security-hardening.test.ts` | `US-05 / Scenario 2` |
| | All dependencies pinned | `us05-security-hardening.test.ts` | `US-05 / Scenario 3` |

## Three Test Layers

| Layer | Source | Direction | Purpose |
|-------|--------|-----------|---------|
| **Golden (code-derived)** | Backend audit | Bottom-up | "Does the existing code work?" |
| **Golden (Gherkin-derived)** | Phase 1 PRD | Top-down | "Does the code meet requirements?" |
| **Adversarial** | OWASP + Mythos threat model | Attack surface | "Can the code be broken?" |

## OODA Loop Integration

```
OBSERVE  → npm run lint && tsc --noEmit
ORIENT   → npm run test:golden (regression baseline)
DECIDE   → npm run test:adversarial (security delta — getting better or worse?)
ACT      → Block merge or promote to Phase 5 Governance gate
LOOP     → Fixed adversarial tests migrate to golden suite
```
