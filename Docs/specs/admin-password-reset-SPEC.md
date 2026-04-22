# BlackBar — Admin Password Reset (Future PR)

**Status:** Spec drafted · 2026-04-21 · Parked until current sprint PRs (#6–#10) merge and Railway smoke test passes
**Owner:** Caleb (PO)
**Trigger to build:** After current sprint is shipped + Lane actually needs to reset a user password, OR when a new user is added to the system

---

## One-line

Admin-only endpoint + UI that lets Lane reset any user's password in one click by auto-generating a secure random password shown to the admin once.

---

## Why It Exists

Lane is the admin/owner. He needs operational control over user access (starting with Mariz) without Caleb being a bottleneck. He shouldn't have to invent passwords or navigate complex admin surfaces — one click, copy, deliver.

---

## The Design Decision That Matters

**Auto-generate, don't let Lane type.** Server generates a cryptographically random password; shows Lane once; he copies and delivers it to the user via secure channel. No client-side password invention, no validation flow, no complexity.

| Manual-type | Auto-generate (CHOSEN) |
|---|---|
| Admin invents password — prone to weak choices | Server generates (16 chars, mixed case + digit + symbol) |
| Client-side validation rules | Zero client-side validation |
| Admin types twice (password + confirm) | Admin clicks once |
| Password in client form state briefly | Server→client once, never retrievable again |

---

## Goals

1. Lane can reset any user's password in under 30 seconds end-to-end
2. Generated password meets complexity rules without requiring admin to think
3. Generated password is shown exactly once (not retrievable via any endpoint after initial response)
4. Non-admin users cannot access the reset endpoint or see the admin UI
5. Every reset creates an audit log entry in the `events` table

## Non-Goals (out of scope for V1)

- Email delivery of password to user (no SMTP integration)
- Self-service "forgot password" flow
- Force-change-on-first-login (would require `requires_password_change` boolean + redirect middleware — V1.1)
- JWT session invalidation on reset (target user's live session stays valid until JWT expiry — V1.1)
- Admin role editing, invite-new-user, delete-user (separate PRs if ever needed)

---

## Architecture

### Backend (~150 lines)

- **`webapp/server/middleware/requireAdmin.ts`** — JWT + role check (10 lines)
- **`webapp/server/services/passwordGen.ts`** — `crypto.randomBytes` → base64 → 16 chars, post-process enforces complexity (15 lines)
- **`webapp/server/routes/admin.ts`** — two endpoints:
  - `GET /api/admin/users` — list (id, name, email, role, created_at, last_login_at); NEVER returns passwordHash
  - `POST /api/admin/users/:userId/password/reset` — generates, bcrypt-hashes, stores, returns `{ tempPassword, userId, resetAt }` with `Cache-Control: no-store`; writes audit log row

### Frontend (~200 lines)

- **`webapp/src/pages/admin/Users.tsx`** — list page (existing TanStack Query + Zustand patterns); rows + "Reset password" button per user
- **`webapp/src/components/PasswordResetModal.tsx`** — confirm → call API → display tempPassword with "Copy to Clipboard" button + "shown once" banner → close clears all state
- **`webapp/src/components/AdminRoute.tsx`** — route guard, redirects non-admins (10 lines)
- Nav change: "Users" link visible only when `user.role === 'admin'` (1 line change in existing nav)

### No schema change

Uses existing `passwordHash` column on users. Uses existing `events` table for audit log. Zero migration required.

---

## Lane's Flow (30 seconds end-to-end)

1. Login → sees "Users" link in nav (admin-only visibility)
2. Click Users → small page, user rows with "Reset password" button
3. Click "Reset password" next to target user → confirm modal
4. Confirm → server generates + stores hash + returns plaintext once
5. Modal shows plaintext with "Copy to Clipboard" button + banner: *"This password is shown only once. Copy it now and deliver it to the user through a secure channel."*
6. Admin copies, delivers out-of-band, closes modal
7. Modal closes → plaintext gone from UI state forever

---

## Ship Criteria

- [ ] `requireAdmin` middleware rejects non-admin JWTs with 403
- [ ] `GET /api/admin/users` returns list for admins, 403 for non-admins
- [ ] `POST /api/admin/users/:userId/password/reset` returns tempPassword + updates hash + writes audit row
- [ ] Generated password matches complexity rules (length ≥ 16, mixed case + digit + symbol)
- [ ] Response has `Cache-Control: no-store`
- [ ] Target user can log in with tempPassword after reset
- [ ] Admin UI appears in nav only when `role === 'admin'`
- [ ] PasswordResetModal shows tempPassword exactly once; closing clears all state
- [ ] Integration tests pass: happy path, 403 for non-admin, 404 for missing user, complexity regression
- [ ] `npm run build` + `tsc --noEmit` clean
- [ ] PR opens against main, review walkthrough produced

---

## Branch & Commit Plan

- Branch: `feat/admin-password-reset` off main (fresh after current sprint merges)
- Commit chunks:
  1. `feat(admin): requireAdmin middleware + password generator service + routes + tests`
  2. `feat(admin): Users list page + PasswordResetModal + AdminRoute guard`
  3. `feat(admin): show Users nav link for admin role`
- PR title: `feat(admin): admin password-reset endpoint + UI`
- PR size: small, one review pass

---

## Open Questions (resolve before V1.1)

1. **Session invalidation** — should resetting a user's password immediately invalidate their existing JWTs? At BlackBar's scale (3 users, rare resets), ≤24h JWT expiry is fine. If real concern: add `token_version` field on user row, include in JWT payload, bump on reset, middleware rejects stale versions.
2. **Force-change-on-first-login** — should target user be forced to set their own password the first time they log in with the temp? Nice-to-have; adds middleware + flow. V1.1.
3. **Two-step display** — for V2 (when team grows), consider: admin clicks reset → short-lived URL token emailed/shown → Lane visits `/admin/password-display?token=...` once. More auditable than inline JSON response. Don't build now.

---

## Activation

When ready to build, paste this into a fresh Claude Code session at `~/BLACK-BAR`:

```
Build BlackBar's admin password-reset feature per the spec at Docs/specs/admin-password-reset-SPEC.md.

Read the spec fully first. Branch: feat/admin-password-reset off main. Scope locked to V1 only — do not start V1.1 items (session invalidation, force-change-on-first-login).

Commit in the 3 chunks listed in the spec. Open PR. Print URL. Stop.
```

---

*Parked 2026-04-21 during the BlackBar sprint close-out. Bring back when the current PR queue is empty and Lane needs to reset Mariz's password or a new user joins.*
