# Datun Seed Pipeline

Production-grade database seeding, anonymization, export, and load-testing toolkit for the Datun platform.

## Quick start

```bash
# Run the demo scenario locally
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts seed --strategy demo

# Print the module DAG
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts manifest

# Validate dependency graph
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts validate dag
```

## Available strategies

| Name         | Use case                             | Records | Time    |
| ------------ | ------------------------------------ | ------- | ------- |
| `minimal`    | Smoke test (reference + 5 clinics)   | ~100    | <30 s   |
| `demo`       | Sales demo (50 clinics, 1k patients) | ~5 k    | ~3 min  |
| `staging`    | Production mirror with anonymization | ~50 k   | ~15 min |
| `load-test`  | 100 k users + 365-day historical     | ~500 k  | ~45 min |
| `e2e-test`   | Hermetic deterministic fixture (CI)  | ~50     | <60 s   |
| `perf-bench` | Latency benchmarking                 | ~50 k   | ~10 min |
| `regression` | Locked-seed nightly regression       | ~500    | ~2 min  |
| `recovery`   | Snapshot-only restore                | varies  | <1 min  |

## Subcommands

| Command     | Purpose                                |
| ----------- | -------------------------------------- |
| `seed`      | Run a strategy preset                  |
| `snapshot`  | Save logical snapshot of seeded tables |
| `restore`   | Restore from a snapshot                |
| `export`    | JSONL / CSV / dump / fine-tuning       |
| `validate`  | DAG, PII scan, golden fixture compare  |
| `manifest`  | Print execution plan                   |
| `anonymize` | In-place DPDP/HIPAA/GDPR masking       |
| `bench`     | p50/p95/p99 latency report             |

## Documentation

- [Architecture](./ARCHITECTURE.md)
- [Runbook](./RUNBOOK.md)
- [DPDP compliance](./DPDP_COMPLIANCE.md)
- [Exporters guide](./EXPORTERS_GUIDE.md)
- [Anonymization rules](./ANONYMIZATION_RULES.md)
- [CLI reference](./CLI_REFERENCE.md)
- [Migration from legacy](./MIGRATION_FROM_VANILLA.md)
