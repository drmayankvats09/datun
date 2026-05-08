# Migration from Vanilla Seed → Datun Seed Pipeline

This guide describes how to migrate from the legacy single-file `prisma/seed.ts` to the multi-wave Datun seed pipeline.

## Why migrate

| Concern          | Legacy seed.ts           | Datun seed pipeline                               |
| ---------------- | ------------------------ | ------------------------------------------------- |
| Module count     | 1 monolithic file        | 60+ atomic modules                                |
| Idempotency      | Manual or absent         | First-class per module                            |
| Failure recovery | All-or-nothing           | Saga compensation + checkpoint resume             |
| Anonymization    | None                     | DPDP / HIPAA / GDPR rule sets + k-anonymity       |
| Exports          | None                     | JSONL / CSV / pg_dump / BigQuery / fine-tuning    |
| E2E testing      | None                     | TestContainers Postgres + Vitest fixtures         |
| Load testing     | None                     | K6 scripts (smoke / load / stress / spike / soak) |
| CI integration   | Manual                   | 6 scheduled workflows                             |
| Observability    | console.log              | Sentry + Better Stack + Prometheus                |
| 1 lakh records   | 30+ minutes (createMany) | < 5 minutes (COPY for hot paths)                  |

## Pre-migration checklist

- [ ] Tag legacy `prisma/seed.ts` as `legacy/seed.ts` (do not delete; reference for parity)
- [ ] Schema migrations are clean (no pending changes)
- [ ] PostgreSQL version is 16 or newer
- [ ] All tests on the current branch are green

## Step-by-step migration

### 1. Move legacy file aside

```bash
git mv packages/db/prisma/seed.ts packages/db/prisma/legacy/seed.ts.bak
```

### 2. Create the new entry point

The Wave 4 deliverable already creates `packages/db/prisma/seeds/seed.ts`. Verify by:

```bash
ls packages/db/prisma/seeds/seed.ts
```

### 3. Update `package.json`

```json
{
  "scripts": {
    "seed": "tsx prisma/seeds/cli/index.ts seed --strategy demo",
    "seed:minimal": "tsx prisma/seeds/cli/index.ts seed --strategy minimal",
    "seed:demo": "tsx prisma/seeds/cli/index.ts seed --strategy demo",
    "seed:dry": "tsx prisma/seeds/cli/index.ts seed --strategy demo --dry-run",
    "seed:manifest": "tsx prisma/seeds/cli/index.ts manifest",
    "seed:test": "vitest run prisma/seeds/e2e-harness/",
    "seed:bench": "tsx prisma/seeds/cli/index.ts bench"
  },
  "prisma": {
    "seed": "tsx prisma/seeds/cli/index.ts seed --strategy demo"
  }
}
```

### 4. Verify locally

```bash
pnpm --filter @repo/db exec prisma migrate reset --force
pnpm --filter @repo/db run seed:minimal
pnpm --filter @repo/db run seed:test
```

Both commands should complete with `✓ Seed complete: COMPLETED`.

### 5. Wire CI

Confirm the six workflows in `.github/workflows/seed-*.yml` are committed and have valid YAML. The first PR after migration triggers `seed-test-matrix.yml`.

### 6. Wire alerting (optional)

Add to GitHub repo secrets:

- `SLACK_WEBHOOK_URL` — Slack webhook for nightly regression alerts
- `RESEND_API_KEY`, `ALERT_TO_EMAIL`, `ALERT_FROM_EMAIL` — email alerts
- `SENTRY_DSN` — production seed-failure capture
- `BETTER_STACK_LOGS_TOKEN` — structured log shipping

### 7. Wire production secrets

- `STAGING_DATABASE_URL` — Railway staging Postgres URL
- `SEED_ANONYMIZATION_SALT` — non-prod random string (rotate quarterly)
- `AWS_OIDC_ROLE_ARN` — IAM role for S3 export uploads
- `AWS_S3_EXPORT_BUCKET` — S3 bucket name (must be `ap-south-1`)

## Parity verification

| Check                            | Legacy result | Pipeline result | Match  |
| -------------------------------- | ------------- | --------------- | ------ |
| 5 demo clinics created           | ✓             | ✓               | ✓      |
| Hindi + English language records | ✓             | ✓               | ✓      |
| Dental conditions ICD-10 coded   | partial (30)  | full (100+)     | better |
| Salts catalog                    | partial (13)  | full (80+)      | better |
| Rerun without errors             | manual reset  | idempotent      | better |

## Rollback plan

If the new pipeline produces issues you cannot diagnose within an hour:

```bash
git revert <migration-commit>
git mv packages/db/prisma/legacy/seed.ts.bak packages/db/prisma/seed.ts
pnpm --filter @repo/db exec prisma migrate reset --force
pnpm --filter @repo/db run db:seed
```

The legacy seed remains parity-verified and deploys cleanly.

## Next steps

- Capture a `golden-fixture` baseline for `regression`:

```bash
  datun-seed seed --strategy regression --seed 4242
  # then capture inside a Vitest run
```

- Schedule the `seed-export-snapshot` workflow for the first Sunday after migration.
- Review the unmapped-PII list from `validate schema-pii` and add custom rules as needed.
