# Credential Rotation — 2026-05-04

## Trigger

`.env.save` (a 455-byte plaintext credential backup) was discovered on disk at the repo root during PR 0 verification of the `/ship-v1` workflow on branch `feat/dag-lane-gate-recovery`. File was Mac-local, never committed (gitignored, no git history), no cloud sync.

## Scope of rotation

| Credential | Status | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | rotated | New key active; old key revoked in Anthropic console |
| `JWT_SECRET` | rotated | Regenerated via `openssl rand -base64 32` |
| `DATABASE_URL` | deferred (Path C) | Bounded risk: leak was Mac-local, no sync. Rotation scheduled this evening via Railway CLI as follow-up cleanup |
| `SEED_PASSWORD` | not rotated (intentional) | Seed-time variable; not in Railway env per CLAUDE.md. Mitigation: in-app password change at next login for Lane / Mariz / Caleb users |

## Verification steps (all passed)

1. `.env.save` deleted from disk (`/Users/calebswainston/Code/01-SCG/BlackBar/_main-repo/.env.save`) — `ls` returns "No such file or directory".
2. `git log --all --full-history -- .env.save` returns empty — file never committed.
3. `.gitignore` covers `.env.save*` patterns (commit `b7aa7bc`, 2026-05-04).
4. Local `.env` `ANTHROPIC_API_KEY` first 4 chars after `sk-ant-api03-` prefix match the value Caleb confirmed in chat.
5. Live Anthropic API ping — `POST /v1/messages` with `claude-haiku-4-5-20251001`, `max_tokens: 1` — returned HTTP 200, valid response, 8 input + 1 output tokens billed.
6. Railway env vars confirmed updated by Caleb: `ANTHROPIC_API_KEY`, `JWT_SECRET`.

## Key tracking (first 4 chars only)

| Credential | Old (revoked) | New (active) |
|---|---|---|
| `ANTHROPIC_API_KEY` (post-`sk-ant-api03-` prefix) | `GDMU` | `YAWG` |
| `JWT_SECRET` | n/a (regenerated) | n/a |

Full keys are never recorded here.

## Mid-verification finding

First PR 0 attempt surfaced a mismatch: local `.env` showed `GDMU…` while Caleb cited `YAWG…` as the rotated value. Resolution: local `.env` had not yet been re-saved with the new key; Caleb updated local, revoked `GDMU` in the Anthropic console, and re-ran verification. Second attempt passed all checks.

## Follow-ups

- [ ] Rotate `DATABASE_URL` via Railway CLI (Caleb, this evening)
- [ ] Force in-app password change for Lane / Mariz / Caleb on next login (mitigation for `SEED_PASSWORD` leak)
- [ ] Audit any other `*.save` / `*.bak` patterns in repo and Mac home
