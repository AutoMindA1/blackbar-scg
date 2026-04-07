# BlackBar Security Hardening — Claude Code Prompt

> Run this AFTER the main architecture audit + UI spec sprint completes.
> Working directory: BLACK-BAR/webapp

---

## Prompt (copy/paste into Claude Code)

```
Read ARCHITECTURE_AUDIT_v1.1.md for context on the codebase, then execute these 6 security fixes in order. Do not skip any. Each fix is small and isolated.

## Fix 1: Sanitize HTML report rendering (XSS — CRITICAL)

Install DOMPurify:
npm install dompurify @types/dompurify

Add sanitization to every file that uses dangerouslySetInnerHTML:

- src/pages/CaseDrafting.tsx — sanitize report content before rendering
- src/pages/CaseExport.tsx — sanitize report content before rendering and before building the download blob
- Any other component that renders HTML from the database

Pattern:
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(rawHtml, { ALLOWED_TAGS: ['h1','h2','h3','h4','p','ul','ol','li','em','strong','br','hr','table','tr','td','th','thead','tbody','span','sub','sup'], ALLOWED_ATTR: ['style','class'] });

Also sanitize server-side before storing: in server/routes/reports.ts PUT endpoint, strip <script>, <iframe>, <object>, <embed>, on* event handlers from the content string before saving to database.

## Fix 2: Rate limit agent trigger endpoint (API cost protection)

In server/routes/agents.ts, add a per-case cooldown so the same case can't trigger the same agent stage more than once per 60 seconds:

- Import rateLimit from express-rate-limit (already installed — used in auth.ts)
- Add a rate limiter to POST /:id/agents/:stage — max 2 requests per minute per IP
- Return 429 with message: "Agent already running for this case. Wait for completion or try again in 60 seconds."

## Fix 3: Move secrets out of committed files

- Check if .env is in .gitignore. If not, add it.
- Check if seed.ts passwords are hardcoded. If yes, change seed.ts to read from environment variables:
  const SEED_PASSWORD = process.env.SEED_PASSWORD || 'change-me-in-production';
- Add SEED_PASSWORD to .env
- Add a comment in .env: # ROTATE THESE VALUES IN RAILWAY — DO NOT COMMIT

## Fix 4: SSE token scoping

The SSE auth fix (from Sprint 1) puts the full JWT in the URL query string. Harden this:

In server/routes/agents.ts GET /:id/agents/stream endpoint:
- Accept ?token= from query string (the Sprint 1 fix)
- But also add: the token from query string should be validated the same way as the Bearer token — using jwt.verify with JWT_SECRET
- Log a warning (not the token itself) when a query-param token is used: console.warn(`SSE auth via query param for case ${caseId}`)
- In the future this should be replaced with short-lived SSE-specific tokens, but for now this is acceptable for a 3-user internal tool

## Fix 5: Tighten CORS for production

In server/index.ts:
- If NODE_ENV === 'production', ALLOWED_ORIGINS must NOT contain localhost
- Add a check: if (!process.env.ALLOWED_ORIGINS && process.env.NODE_ENV === 'production') throw new Error('ALLOWED_ORIGINS must be set in production')
- Add the Railway domain to .env as a comment placeholder: # ALLOWED_ORIGINS=https://blackbar-production.up.railway.app

## Fix 6: Upload hardening

In server/routes/documents.ts:
- Reduce max file size from 50MB to 25MB (sufficient for legal PDFs, reduces abuse surface)
- Reduce max files per request from 20 to 10
- Add a per-case document count check: if a case already has 50+ documents, reject with 400 "Document limit reached for this case"
- Verify the file extension matches the MIME type (already partially done — tighten the check)

After all 6 fixes, run: npm run build && npm run lint

Report any errors and fix them before finishing.
```

---

## What this covers

| Fix | Threat | Severity | Effort |
|-----|--------|----------|--------|
| DOMPurify | XSS via report HTML injection | **Critical** | 15 min |
| Rate limit agents | Claude API cost runaway | **High** | 10 min |
| Secrets cleanup | Credential leak if repo goes public | **High** | 10 min |
| SSE token logging | JWT in URL visible in logs | **Medium** | 5 min |
| CORS production check | Open CORS in prod | **Medium** | 5 min |
| Upload limits | Storage abuse, oversized uploads | **Low** | 10 min |

**Total: ~55 minutes of Claude Code execution time**

---

## What this does NOT cover (Phase 2 hardening, later)

- Short-lived SSE tokens (replace full JWT in query param)
- Helmet CSP tightening for production
- Structured logging (pino/winston replacing console.log)
- Database backup strategy
- Virus/malware scanning on uploads
- Row-level security (multi-user data isolation)
- HTTPS enforcement / HSTS headers
- Session expiry and token rotation
