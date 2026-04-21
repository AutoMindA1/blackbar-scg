# BlackBar — Database Runbook

**Stack:** PostgreSQL on Railway · Prisma 6.19 · migrations tracked in `webapp/prisma/migrations/` · seed in `webapp/prisma/seed.ts`.

**One-line model:** every schema change is a committed migration; Railway applies pending migrations automatically on every container start. You never run `db push` against production. Ever.

---

## TL;DR — What Runs When

| Trigger | What happens | Who runs it |
|---|---|---|
| `git push` to `main` | Railway rebuilds: install → `prisma generate` → `npm run build` | Railway (auto) |
| Container start | `prisma migrate deploy` → `node dist/server/index.js` | Railway (auto, in `railway.toml` `startCommand`) |
| Local schema change | `npm run db:migrate:new -- <name>` writes a migration SQL file | You |
| New dev / new agent boot | Reads `webapp/.env.example` → fills `.env` → `npm run db:setup` | You |
| Need to wipe local DB | `npm run db:migrate:reset` | You |
| Forgot what's deployed | `npm run db:migrate:status` | You |

---

## Daily Ops

### Add a column / table / index

```bash
# 1. Edit webapp/prisma/schema.prisma
# 2. Generate the migration (writes SQL to webapp/prisma/migrations/<timestamp>_<name>/migration.sql):
cd webapp
npm run db:migrate:new -- add_case_priority

# 3. Inspect the generated SQL. Edit if Prisma's default isn't what you want.
# 4. Commit the schema.prisma change AND the new migrations/ folder together.
# 5. Push. Railway applies on next start.
```

**Hard rule:** the schema file and its migration SQL ship in the same commit. A schema change without a migration is a bug.

### Seed (idempotent)

```bash
cd webapp
npm run db:seed
```

Reads `SEED_LANE_PASSWORD` and `SEED_MARIZ_PASSWORD` from env. In production, refuses to run if either is missing. In development, falls back to a placeholder password and warns loudly.

The seed creates / migrates two users:
- `lane@swainstonconsulting.com` — admin
- `mariz@swainstonconsulting.com` — consultant

If a legacy-email user exists (`lane@swainston.com`, `mariz@swainston.com`), the seed migrates them to the canonical email instead of creating duplicates.

### Check what's applied

```bash
cd webapp
npm run db:migrate:status
```

Shows: applied migrations, pending migrations, drift between `schema.prisma` and the database.

---

## Deploy Mechanics — What Railway Actually Does

```
git push origin main
  │
  ▼
Railway detects push, starts build container
  │
  ▼
[BUILD]  cd webapp && npm install
         npx prisma generate     # writes Prisma client into node_modules
         npm run build           # tsc + vite build
  │
  ▼
Build artifact is captured. New container is provisioned.
  │
  ▼
[START]  cd webapp
         npx prisma migrate deploy   # ← applies any pending migrations
         node dist/server/index.js   # ← only runs if migrations succeeded
  │
  ▼
Healthcheck on /api/health (30s timeout)
  │
  ▼
If healthy: traffic shifted to new container, old container drained.
If unhealthy: Railway retries up to 3× (per railway.toml restartPolicy).
```

**Why migrations run at start, not build:** the build container doesn't always have a live `DATABASE_URL`. The runtime container always does. `prisma migrate deploy` is idempotent — running it on every restart is safe and free when there's nothing pending.

---

## Recovery

### "Migration failed mid-deploy. Now what?"

Railway will keep restarting the container. Each restart re-runs `prisma migrate deploy`. If the migration is structurally broken (bad SQL), every restart fails the same way.

**Fix path:**

1. Connect to Railway Postgres directly (Railway dashboard → Postgres → Data → Connect).
2. Inspect the `_prisma_migrations` table. The failed migration row has `finished_at = NULL` and `logs` populated.
3. Either:
   - **Option A (preferred):** fix the migration SQL locally, ship as a NEW migration (don't edit applied migrations). Mark the failed one as rolled-back via `npx prisma migrate resolve --rolled-back <migration_name>`.
   - **Option B (last resort, construction-mode only):** `npx prisma migrate resolve --applied <migration_name>` to mark it manually applied, then ship a corrective migration.

### "Local schema and DB drifted (worked on it without a migration)."

```bash
cd webapp
# Show what's drifted
npm run db:migrate:status
# Nuclear: wipe local DB and re-apply all migrations from scratch + reseed
npm run db:migrate:reset
```

`db:migrate:reset` drops the database, re-applies every migration in order, runs the seed. Safe in dev, NEVER on production.

### "Need to wipe production users (construction mode only)"

```sql
-- Connect via Railway dashboard → Postgres → Data → Query
DELETE FROM "users";
```

Then trigger a redeploy or run seed manually. Once real users exist, this section gets deleted from this runbook.

---

## Backup / Restore

Railway Postgres has automatic daily snapshots (Railway dashboard → Postgres → Backups). Retention depends on your Railway plan.

**Manual snapshot before risky migration:**

```bash
# From local machine, with Railway public connection string:
pg_dump "$RAILWAY_PUBLIC_DATABASE_URL" > backup-$(date +%Y%m%d-%H%M%S).sql
```

**Restore from snapshot (Railway dashboard does this for you):**
Railway → Postgres service → Backups → "Restore from this point."

**Restore from local pg_dump:**

```bash
psql "$RAILWAY_PUBLIC_DATABASE_URL" < backup-YYYYMMDD-HHMMSS.sql
```

---

## Env Vars Cheat Sheet

Required in Railway (production):

| Var | Source | Purpose |
|---|---|---|
| `DATABASE_URL` | Railway auto-injects when Postgres is linked to webapp service | Prisma connection |
| `JWT_SECRET` | You set (64+ random chars) | Auth token signing |
| `SEED_LANE_PASSWORD` | You set | Lane's seeded password |
| `SEED_MARIZ_PASSWORD` | You set | Mariz's seeded password |
| `ALLOWED_ORIGINS` | You set | CORS — Railway public URL |
| `ANTHROPIC_API_KEY` | You set | Agent pipeline calls |
| `NODE_ENV` | Set to `production` | Triggers prod-mode guards in seed + CORS |
| `PORT` | Railway auto-injects | Express port |

Local dev: copy `webapp/.env.example` to `<repo-root>/.env` and fill values.

---

## Gotchas

1. **`.env` is at the repo root, not inside `webapp/`.** All scripts use `dotenv -e ../.env`. If you put `.env` in `webapp/`, nothing reads it.
2. **`prisma/seed.ts` is at `webapp/prisma/seed.ts`, not `webapp/server/seed.ts`.** Old code referenced the wrong path; current `package.json` points at the right one.
3. **`prisma migrate deploy` (production) is NOT `prisma migrate dev` (local).** `dev` writes new migrations and may reset the DB. `deploy` only applies committed migrations and never modifies them. Production never runs `dev`.
4. **`npm run db:push` is gone.** It was a footgun — bypasses migration history. Use `db:migrate:new` to create a tracked migration instead.
5. **Migrations are immutable once committed.** Never edit a migration that has been applied to any environment. Always ship a new corrective migration.
6. **Construction mode only:** while no real users exist, `db:migrate:reset` against production is acceptable as a recovery escape hatch. The day Lane logs in for the first real session, this runbook gets a "DO NOT RESET PROD" rule added at the top.

---

## When to Open This Runbook

- Adding a column → §Daily Ops
- Deploy failed → §Recovery
- New env or new dev onboarding → §Env Vars Cheat Sheet
- Anything weird with users/passwords → §Daily Ops > Seed
- About to do something irreversible → §Backup / Restore first

If the answer isn't here, the runbook needs a new section. Add it.
