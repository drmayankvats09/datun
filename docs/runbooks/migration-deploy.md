# Runbook: Migration Deploy

Operator procedure for safely deploying a schema change to production.

---

## Pre-flight (local)

```bash
# 1. Ensure schema and migrations are in sync
pnpm --filter @repo/db prisma format
pnpm --filter @repo/db prisma validate

# 2. Generate migration on local shadow DB
pnpm --filter @repo/db prisma migrate dev --name <descriptive-name>

# 3. Auto-generate ROLLBACK.sql skeleton
pnpm --filter @repo/db db:rollback:gen packages/db/prisma/migrations/<NEW>

# 4. Hand-edit ROLLBACK.sql for any TODO MANUAL items

# 5. Run pre-flight gate
DATABASE_URL=<prod-url> SHADOW_DATABASE_URL=<local-shadow> \
  bash scripts/migration-pre-flight.sh
```

If pre-flight passes:

```bash
git add packages/db/prisma/migrations packages/db/prisma/schema.prisma
git commit -m "feat(db): <descriptive change>"
git push origin <branch>
```

## PR review checklist

The PR auto-comment from `migration-validate.yml` shows:

- Tables added / dropped
- Columns added / dropped
- Risk level per statement (low / medium / high)
- Estimated lock duration

If any high-risk item appears: pause, redesign as expand-contract, re-PR.

## Production deploy

After PR merge:

1. Railway auto-builds main branch
2. Build phase runs `prisma migrate deploy`
3. Healthcheck on `/health` confirms migration health = ok
4. Post-deploy smoke test runs automatically

## Post-deploy verification

```bash
# From any machine with curl
API_URL=https://api.datunai.com \
  BULL_BOARD_USER=$BULL_BOARD_USER \
  BULL_BOARD_PASSWORD=$BULL_BOARD_PASSWORD \
  bash scripts/verify-migration-applied.sh
```

Expected: status `ok`, exit 0.

## If deploy fails

- Railway shows previous version (blue-green)
- No data loss because `migrate deploy` is transactional within each migration
- Investigate via `/internal/migration/status` (last failed entry in `auditTrailLast10`)
- Restore from `pre-task-<n>-baseline-<date>.sql` only if data corruption (rare)
- See [migration-rollback.md](./migration-rollback.md)
