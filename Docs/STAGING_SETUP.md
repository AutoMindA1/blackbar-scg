# Staging Environment Setup

## Railway Dashboard Steps (manual, one-time)

1. Open railway.app → project airy-creativity
2. Click "+" to add a new service
3. Select "GitHub Repo" → AutoMindA1/blackbar-scg
4. Set branch to `staging`
5. Set Root Directory to `webapp`
6. Build Command: `npm install && npm run build`
7. Start Command: `node dist/server/index.js`
8. Add a new Postgres service for staging OR use the same Postgres with a `_staging` schema prefix
9. Copy all environment variables from production service:
   - DATABASE_URL (point to staging Postgres)
   - JWT_SECRET (can be the same or different)
   - PORT (Railway assigns automatically)
   - R2_* variables (if configured — can share the same bucket with a `staging/` key prefix)
10. Deploy. Railway assigns a staging URL automatically.
11. Test login at staging URL with lane@swainstonconsulting.com / savage-wins-2026

## Workflow

- Push to `staging` → staging service auto-deploys
- Test on staging URL
- When green: `git checkout main && git merge staging && git push origin main`
- Production auto-deploys from main
