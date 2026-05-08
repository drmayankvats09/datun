# Compatibility Matrix

## Supported combinations

|             | PG 16 | PG 17 | PG 18 |
| ----------- | ----- | ----- | ----- |
| Node 20 LTS | ✅    | ✅    | ✅    |
| Node 22 LTS | ✅    | ✅    | ✅ ⭐ |
| Node 24     | ✅    | ✅    | ✅    |

⭐ = primary supported combination (production + CI default).

## Prisma compatibility

- Prisma ≥6.0.0 is required (typed client extensions, `$extends`)
- Prisma 7 is tracked in CI; production cutover gated on stability of `migrate diff` JSON output

## CI matrix

The `seed-compat-matrix.yml` workflow runs every Saturday at 02:00 UTC, executing the full validation suite against every combination above. Failures are filed as issues automatically and assigned to the maintainer on rotation.

## Why these versions

- **PG 16**: minimum supported by Railway managed Postgres
- **PG 17**: stable since 2024-09; widely adopted on managed providers
- **PG 18**: current production primary; release notes
- **Node 20 LTS**: maintained until April 2026
- **Node 22 LTS**: maintained until April 2027 (current production primary)
- **Node 24**: current — included for early-warning regression detection

## Drop policy

A version drops out of the matrix only after:

1. The official maintainer end-of-life date has passed.
2. Two release cycles have elapsed.
3. No production tenant is on the version.

This guarantees customers a predictable upgrade window of at least 18 months.
