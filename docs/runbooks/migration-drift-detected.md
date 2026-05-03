# Runbook: Migration Drift Detected

The nightly drift check has reported a difference between `schema.prisma` and the production database.

---

## Severity

**HIGH.** Drift means production state diverged from source-of-truth without an audited migration. Possible causes:

1. Manual `psql` ALTER ran in production (unauthorized or emergency hotfix)
2. Migration applied to prod but ROLLBACK.sql was applied later, leaving Prisma `_prisma_migrations` out of sync
3. Restore-from-backup was performed and metadata is stale
4. Bug in drift detection logic (rare)

## Investigation procedure

### Step 1 — Read the diff

```bash
DATABASE_URL=$PROD_DB_URL pnpm --filter @repo/db db:drift:check
```

The output is the SQL needed to align production WITH `schema.prisma`. If the SQL would CREATE something, schema is ahead. If the SQL would DROP, production is ahead (someone added something manually).

### Step 2 — Determine cause

Cross-reference:

```bash
# What was the last applied migration recorded?
curl -u $BULL_BOARD_USER:$BULL_BOARD_PASSWORD \
  https://api.datunai.com/internal/migration/status | jq .lastApplied

# Match against git log of schema.prisma
git log --oneline packages/db/prisma/schema.prisma | head -10
```

### Step 3 — Resolve

| Cause                        | Resolution                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Manual prod ALTER            | Capture the change as a new migration: `prisma migrate dev --name from-prod-drift`. Apply baseline: `migrate resolve --applied`. |
| Stale metadata after restore | Re-run `prisma migrate resolve --applied <last-applied>`                                                                         |
| Bug in drift detection       | Open issue, attach diff output, tag `bug/critical`                                                                               |

### Step 4 — Lessons learned

- Was the manual change documented anywhere? If not, audit log update needed.
- Did monitoring catch it before users complained? If not, alerting tighter.
- Could a Husky hook have prevented it? Add rule.
