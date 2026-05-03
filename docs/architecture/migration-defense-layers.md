# Architecture: Migration Defense Layers

Datun's migration system is defended in depth — failure at any single layer does not result in a broken production.

---

## Layer 1: Developer machine (Husky)

- `.husky/pre-push` validates schema, checks drift, lints latest migration
- Fast (~10s), advisory only
- Bypass-able for emergencies (`git push --no-verify`)

## Layer 2: Pull request (CI)

- `migration-validate.yml` runs on PR open / update
- Postgres 18 service container
- Steps:
  1. Lint migration SQL (block on errors)
  2. Apply forward migration to fresh shadow DB
  3. Simulate rollback (apply ROLLBACK.sql, verify schema restored)
  4. Generate changelog (auto-comment on PR)

## Layer 3: Main branch CI

- `ci.yml` includes the same migration validation
- Postgres 18 service
- Confirms PRs land in mergeable state

## Layer 4: Railway build phase

- `railway.json buildCommand` includes `prisma migrate deploy`
- Application advisory lock prevents api + worker race
- Build fails if migration fails — previous version stays live

## Layer 5: Healthcheck

- `/health` endpoint includes `migrations: { status }`
- Railway only routes traffic if `/health` returns 200
- Blocks bad deploy from receiving any traffic

## Layer 6: Audit log

- Every migration apply records to `migration_audit` table
- Captures: name, host, duration, success, schema fingerprint, git context
- DPDP compliance evidence

## Layer 7: Smoke test

- Post-deploy curl 5 endpoints (`/health`, `/internal/migration/status`, etc.)
- Failure → manual rollback procedure activates

## Layer 8: Nightly drift check

- Cron at 21:00 UTC (02:30 IST)
- Compares `schema.prisma` to production state
- Mismatch → GitHub issue + Sentry alert within 24h

## Layer 9: Operator visibility

- `/internal/migration/status` endpoint exposes full health
- Bull-board UI for queue/job-related schema concerns
- Better Stack status page integration (status.datunai.com)

## Defense-in-depth principle

A bug at any single layer is recoverable. Multi-layer simultaneous failure (vanishingly unlikely) requires manual intervention and triggers postmortem + new defensive layer.
