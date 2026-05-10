# Wave 6 — Validation, Hardening & Real-World Proof

Wave 6 closes the architecture-versus-execution gap exposed during Wave 5 review. The previous waves delivered pipeline architecture; Wave 6 delivers the proofs that the architecture actually works.

## Layer overview

| Layer     | Scope                                              | Files  |
| --------- | -------------------------------------------------- | ------ |
| 1         | Test foundation + property-based + E2E + golden    | 14     |
| 2         | Live verification probes (8 services)              | 8      |
| 3         | Database-backed audit trail (hash-chained)         | 6      |
| 4         | Real bulk loader (pg-copy-streams + Parquet)       | 6      |
| 5         | Load + bench + chaos (K6 + tinybench + faults)     | 8      |
| 6         | Schema drift detector + modelsTouched instrumenter | 4      |
| 7         | Multi-tenant hardening (per-tenant + isolation)    | 8      |
| 8         | Compatibility matrix (Postgres / Node / Prisma)    | 4      |
| 9         | DR drill + replica routing                         | 6      |
| 10        | GitHub Actions workflows                           | 6      |
| 11        | Documentation                                      | 6      |
| 12        | Config                                             | 4      |
| **Total** |                                                    | **80** |

## What changed versus Wave 5

| Capability           | Wave 5 status       | Wave 6 status                              |
| -------------------- | ------------------- | ------------------------------------------ |
| Anonymization tests  | none                | 60+ unit + property-based (10k iterations) |
| Saga compensation    | implemented         | E2E proven via fault injection             |
| pg-copy-streams      | fallback only       | real, with benchmark vs `createMany`       |
| Parquet exporter     | fallback only       | real `@dsnp/parquetjs` writer + reader     |
| K6 load tests        | hard-coded prod URL | staging-only with hard guard               |
| Audit trail          | file-based          | DB-backed, hash-chained, retention-tiered  |
| Coverage measurement | none                | enforced thresholds in CI                  |
| Multi-tenant         | wrapper only        | full isolation tests + per-tenant CLI      |
| Compatibility matrix | none                | PG 16/17/18 × Node 20/22/24 nightly        |
| DR drill             | none                | quarterly automated, RTO <30 min target    |

## Quick start

```bash
# Run all validation
pnpm --filter @repo/db exec vitest run --coverage

# Run probes
pnpm --filter @repo/db exec tsx prisma/seeds/probes/index.ts

# Run benchmarks
pnpm --filter @repo/db exec tsx prisma/seeds/load-bench/bench-harness.ts

# Run chaos suite
pnpm --filter @repo/db exec tsx prisma/seeds/load-bench/chaos-injector.ts

# Verify audit chain integrity
pnpm --filter @repo/db exec tsx prisma/seeds/audit-db/verify.ts <runId>
```

## Coverage targets

- Anonymization paths: ≥90% lines, branches, functions, statements
- Audit-DB paths: ≥90% lines, branches, functions, statements
- Multi-tenant paths: ≥85% lines, branches, functions, statements
- Everything else: ≥80% lines, branches, functions, statements

A pull request that lowers coverage below threshold will fail CI.
