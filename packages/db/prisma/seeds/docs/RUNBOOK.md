# Datun Seed Runbook

Operational procedures for the seed pipeline. Read before running anything in staging or production.

## Common operations

### 1. Refresh local development database

```bash
pnpm --filter @repo/db exec prisma migrate reset
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts seed --strategy demo
```

### 2. Refresh staging with anonymized data

Trigger the `seed-anonymize-staging` workflow via GitHub Actions UI:

1. Set `dry_run` to `true` first, review the audit log.
2. Re-run with `dry_run: false`.
3. Confirm `seed-export-snapshot` ran the previous Sunday.

### 3. Generate a fine-tuning dataset

```bash
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts export fine-tuning \
  --output ./tmp/datun-ft-2026-q2.jsonl \
  --format openai \
  --min-quality 4 \
  --anonymize
```

### 4. Take a snapshot before risky migration

```bash
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts snapshot \
  --name pre-migration-$(date -u +%Y%m%d) \
  --tables medicationSalt,clinic,doctor,patient,consultation,prescription
```

### 5. Restore from snapshot

```bash
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts restore \
  --name pre-migration-20260504 \
  --truncate-first
```

## Incident playbooks

### Seed run hangs

1. `Ctrl-C` once — graceful shutdown drains within 30 s.
2. If still hung, `Ctrl-C` again — forces exit with code 130.
3. Resume from the last checkpoint:

```bash
   pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts seed \
     --strategy <previous> --resume <runId>
```

### Module fails mid-run

The orchestrator runs compensation in reverse order. To opt out:

```bash
... seed --strategy <name> --no-compensate
```

To continue past failures (analytics-heavy scenarios):

```bash
... seed --strategy <name> --continue-on-error
```

### Memory pressure

Increase heap and reduce parallelism:

```bash
NODE_OPTIONS=--max-old-space-size=8192 \
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts seed \
  --strategy load-test \
  # parallel-exec disabled by default in load-test
```

### Anonymization audit drift

Compare today's audit log to yesterday's:

```bash
diff \
  packages/db/prisma/seeds/audit-logs/anonymization-$(date -u -d yesterday +%Y-%m-%d).jsonl \
  packages/db/prisma/seeds/audit-logs/anonymization-$(date -u +%Y-%m-%d).jsonl
```

Investigate any new entries in `undetectedPiiHighConfidence`.

### Snapshot restore corrupts FK integrity

Use `pg_restore` with `--single-transaction` instead:

```bash
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts restore \
  --name <name> --truncate-first
```

If restoration fails partway, drop the affected tables and re-run.

## Escalation

| Severity | Symptom                                 | Action                                                |
| -------- | --------------------------------------- | ----------------------------------------------------- |
| P0       | Production DB corrupted by seed run     | Stop all writes; restore latest backup; root-cause    |
| P1       | Staging anonymization missed PII fields | Run `validate schema-pii`; update rules; re-anonymize |
| P2       | Nightly regression failed               | Auto-issue opens; investigate within 24 h             |
| P3       | Bench reports p99 regression > 50 %     | Compare commits since last bench; profile hot module  |
| P4       | Manifest validation fails on PR         | Block merge until DAG / registry-key flow is fixed    |

## Rollback procedure

If a seed change breaks production-equivalent staging:

1. `git revert <commit>` and force-push the revert.
2. Run `seed-test-matrix` workflow on the revert.
3. Restore last-known-good snapshot in staging.
4. Open a post-mortem issue with the matrix logs attached.
