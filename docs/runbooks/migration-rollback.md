# Runbook: Migration Rollback

When a migration must be reversed in production.

---

## Decision tree

1. Did migration **fail** during deploy?
   - YES → Railway already kept previous version live. No rollback SQL needed.
     Skip to "Investigate failure" below.
   - NO → Migration applied but is causing issues. Continue to step 2.

2. Was the migration **purely additive** (CREATE TABLE / ADD COLUMN nullable)?
   - YES → Optionally apply ROLLBACK.sql to remove the new artifacts. No data loss risk.
   - NO → DESTRUCTIVE rollback. Continue to step 3.

3. Has user data been written using the new schema?
   - NO → Apply ROLLBACK.sql now (window is small).
   - YES → STOP. Restore from backup is the safer path. Continue to step 4.

4. Restore from backup procedure:
   - Locate latest pre-deploy backup: `C:\Users\Admin\datun-backups\pre-task-<n>-baseline-<date>.sql`
   - Verify SHA-256 matches metadata file
   - Restore: `pg_restore -d $DATABASE_URL <backup>` (or `psql -f` for plain format)
   - Coordinate with team — DB write traffic must be paused during restore

## Apply ROLLBACK.sql

```bash
# Read the rollback SQL
cat packages/db/prisma/migrations/<MIGRATION>/ROLLBACK.sql

# Apply via psql (NOT prisma — Prisma doesn't have rollback command)
psql $DATABASE_URL -f packages/db/prisma/migrations/<MIGRATION>/ROLLBACK.sql

# Mark Prisma migration as rolled back
pnpm --filter @repo/db prisma migrate resolve --rolled-back <MIGRATION>
```

## Investigate failure

```bash
# View migration audit trail
curl -u $BULL_BOARD_USER:$BULL_BOARD_PASSWORD https://api.datunai.com/internal/migration/status | jq .auditTrailLast10

# Find the failed migration
# Look for success=false entries with errorMessage
```

## After successful rollback

- Open postmortem document (template in `docs/postmortems/`)
- Add a regression test that would have caught the issue
- Update ROLLBACK.sql template if pattern is reusable
