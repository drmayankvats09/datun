# CLI Reference

The seed CLI is built on Commander.js with Git-style subcommands.

## Global options

| Flag        | Description                      |
| ----------- | -------------------------------- |
| `--json`    | Output structured JSON to stdout |
| `--quiet`   | Suppress non-error output        |
| `--verbose` | Increase log verbosity           |
| `--help`    | Show help for any command        |
| `--version` | Print CLI version                |

## `seed`

Run an orchestrator scenario.
datun-seed seed [options]
-s, --strategy <name> Strategy preset (default: demo)
--seed <number> Master RNG seed (default: 42)
--dry-run Estimate without writing
--manifest Print module manifest first
--parallel Enable level-parallel execution
--continue-on-error Do not stop on module failure
--no-compensate Disable rollback on failure
--include-categories <csv> Override included categories
--exclude-categories <csv> Override excluded categories
--include-modules <csv> Whitelist module names
--exclude-modules <csv> Blacklist module names
--resume <runId> Resume a previous run from checkpoint

## `snapshot`

Save a logical snapshot.
datun-seed snapshot --name <name> [--tables csv]
datun-seed list-snapshots

## `restore`

Restore a snapshot.
datun-seed restore --name <name> [--truncate-first]

## `export`

Five sub-subcommands:
datun-seed export jsonl --output <path> [--tables csv] [--anonymize]
datun-seed export csv --table <name> --output <path> [--anonymize]
datun-seed export dump --output <path> [--compliance DPDP] [--compression gzip] [--s3-bucket name]
datun-seed export fine-tuning --output <path> [--format openai] [--min-quality 4]

## `validate`

Three sub-subcommands:
datun-seed validate dag # Module DAG + registry-key flow
datun-seed validate schema-pii # Auto-scan Prisma schema for unmapped PII
datun-seed validate golden <name> # Compare DB to golden fixture

## `manifest`

Print the module DAG (use `--json` for machine-readable).

## `anonymize`

In-place anonymization (DESTRUCTIVE — staging only).
datun-seed anonymize --table <name> --compliance DPDP [--dry-run] [--validate-k 5]

## `bench`

Run perf-bench scenario, report p50/p95/p99.
datun-seed bench [--seed 42] [--iterations 3]

## Exit codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 0    | Success                              |
| 1    | Generic error / failed run           |
| 2    | Required secret missing or malformed |
| 3    | Health check failed                  |
| 124  | Graceful shutdown grace exceeded     |
| 130  | Interrupted by user (SIGINT)         |

## Examples

```bash
# Local dev: minimal scenario
datun-seed seed --strategy minimal

# Sales demo with deterministic seed
datun-seed seed --strategy demo --seed 100

# Dry-run a load-test estimation
datun-seed seed --strategy load-test --dry-run

# Resume a checkpointed run
datun-seed seed --strategy load-test --resume run-1714824000-abcdef

# Anonymized weekly export → S3
datun-seed export dump \
  --output ./tmp/weekly.jsonl \
  --compliance DPDP_HIPAA \
  --compression gzip \
  --s3-bucket datun-exports \
  --s3-prefix weekly

# JSON output for CI parsing
datun-seed manifest --json | jq '.totalModules'
```
