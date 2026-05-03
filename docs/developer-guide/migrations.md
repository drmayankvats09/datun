# Developer Guide: Migrations

How to safely change the database schema in Datun.

---

## TL;DR

```bash
# 1. Edit packages/db/prisma/schema.prisma
# 2. Generate migration
pnpm --filter @repo/db prisma migrate dev --name <descriptive-name>

# 3. Generate rollback skeleton
pnpm --filter @repo/db db:rollback:gen packages/db/prisma/migrations/<NEW>

# 4. Edit ROLLBACK.sql (fill TODO MANUAL items)
# 5. Run pre-flight
bash scripts/migration-pre-flight.sh

# 6. Commit, push, PR, merge
```

## Naming conventions

Migration folders: `YYYYMMDDHHMMSS_<snake_case_description>`

Examples:

- ✓ `20260520120000_add_clinic_subdomain`
- ✓ `20260601090000_consultation_status_enum_update`
- ✗ `migration1` (not descriptive)
- ✗ `change` (too generic)

## What CAN be in a single migration

- ✓ Create new tables
- ✓ Add nullable columns
- ✓ Add columns with DEFAULT
- ✓ Create indexes (use CONCURRENTLY for tables >10K rows)
- ✓ Add new enum values

## What CANNOT be in a single migration

- ✗ Drop tables (use expand-contract over 2-3 migrations)
- ✗ Drop columns (same — expand-contract)
- ✗ Rename columns (5-step expand-contract)
- ✗ Change column type with potential data loss
- ✗ Backfill data via UPDATE without batching

## Expand-contract pattern

For renaming column `oldName` to `newName`:

1. **Expand** — add `newName` (nullable). Deploy.
2. **Backfill** — copy `oldName` → `newName` via batched UPDATE script (NOT in a migration).
3. **Switch reads** — code reads from `newName`. Deploy.
4. **Switch writes** — code writes to `newName`. Deploy.
5. **Contract** — drop `oldName`. Deploy.

Five separate migrations. Each is reversible.

## Local testing

```bash
# Run all migration tests
pnpm --filter @repo/db test:migrations

# Apply current migration to fresh shadow DB
pnpm --filter @repo/db db:dry-run

# Verify rollback works
pnpm --filter @repo/db db:rollback:simulate packages/db/prisma/migrations/<MIGRATION>
```

## Need help?

- Schema-design questions: ask in #datun-eng Slack
- Migration system bugs: open issue with `migration-system` label
- Production rollback: see [migration-rollback.md](../runbooks/migration-rollback.md)
