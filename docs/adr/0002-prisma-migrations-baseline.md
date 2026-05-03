# ADR-0002 — Prisma Migrations Baseline

**Status:** Accepted
**Date:** 2026-05-03
**Deciders:** Mayank Vats (CEO), Claude (CTO)
**Task:** #42

---

## Context

Datun v2 reached production on Day 10 (1 May 2026) using `prisma db push` for schema management. This worked for the rebuild phase but is unsuitable for production for the following reasons:

1. **No audit trail.** `db push` does not record which schema state was applied when.
2. **No rollback path.** No SQL artifact exists to reverse a schema change.
3. **No drift detection.** Manual SQL changes against production go undetected.
4. **No migration history.** Compliance (DPDP Act) requires a queryable audit log of schema changes.
5. **No CI safety net.** Schema changes ship straight to prod without dry-run.

This ADR establishes the migration baseline architecture.

## Decision

Adopt **Prisma Migrate** with the following architecture:

### 1. Baseline strategy

- Generate `0_init` migration via `prisma migrate diff --from-empty --to-schema-datamodel`
- Mark applied on local + production via `prisma migrate resolve --applied 0_init`
- Production retains existing tables; new audit tables (`migration_audit`, `schema_snapshot`) added manually before resolve

### 2. Migration application

- **Where:** Railway build phase (`railway.json` → `buildCommand`)
- **How:** `prisma migrate deploy` with application-level advisory lock
- **Why build phase, not start phase:** Atomic — if migration fails, deploy fails, previous version stays. No half-migrated production state.

### 3. Application-level advisory lock

- Lock key: `8273645` (chosen randomly, fixed forever)
- Timeout: 5 minutes (vs Prisma's 10s default — too short for large baselines)
- Acquired before any application code touches the schema

### 4. Migration audit log

- New table `migration_audit` records every migration apply
- Captures: name, applied-by, applied-from, duration, success, schema fingerprint, git commit, git branch, Postgres version, Prisma version
- Complements (does not replace) Prisma's internal `_prisma_migrations`

### 5. Drift detection

- Schema fingerprint = SHA-256 of normalized `schema.prisma`
- Stored in every audit row
- Nightly cron compares production fingerprint to last audit fingerprint
- Mismatch → GitHub issue + Sentry alert

### 6. Linter

- Atlas-style policy engine catches dangerous patterns at PR time
- Rules: no-drop-table, no-drop-column, not-null-without-default, concurrent-index, no-truncate, no-update-all, no-rename-column

### 7. Shadow database

- Local: native Postgres 18 on Windows (`datun_shadow` DB)
- CI: GitHub Actions Postgres service container (ephemeral)
- Used by: `prisma migrate dev`, drift check, dry run, rollback simulation

## Consequences

### Positive

- DPDP-compliant audit trail
- Investor-ready evidence of engineering discipline
- Drift caught within 24 hours of occurrence
- Rolling deploys safe (advisory lock + expand-contract patterns)
- New devs onboard in hours, not days (single source of truth)

### Negative

- Migration discipline cost: every schema change = PR + ROLLBACK.sql + tests
- Build time +15s (migrate deploy)
- One more failure mode to monitor (migration system itself)

### Neutral

- Existing `db push` workflow deprecated for any environment that touches production. Local dev still uses `migrate dev`.

## Alternatives Considered

| Option                | Pros                      | Cons                                      | Verdict               |
| --------------------- | ------------------------- | ----------------------------------------- | --------------------- |
| Continue `db push`    | Simplicity                | No audit, no rollback, no drift detection | Unacceptable for prod |
| Prisma migrate (this) | Standard, tooling rich    | Discipline cost                           | **Selected**          |
| Atlas (separate tool) | Stronger linter, multi-DB | New tool, learning curve                  | Defer to Year 2       |
| Custom SQL files      | Full control              | Reinventing the wheel                     | Rejected              |

## References

- [Prisma Migrate docs](https://www.prisma.io/docs/orm/prisma-migrate)
- [Atlas migration patterns](https://atlasgo.io/concepts/migrations)
- [Stripe API versioning blog](https://stripe.com/blog/api-versioning)
- Datun task #42 (Day 16, 3 May 2026)
