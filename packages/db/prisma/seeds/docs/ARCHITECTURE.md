# Datun Seed Architecture

## Overview

The Datun seed pipeline is a multi-wave system delivering a complete, FAANG-grade orchestrator for database fixtures, anonymization, exports, and load testing. It supports 297 source files across nine architectural layers.

## Cumulative wave structure

| Wave | Scope                                    | Files |
| ---- | ---------------------------------------- | ----- |
| 1    | Utility foundation                       | 8     |
| 2    | Data layer (medical catalogs, locales)   | 47    |
| 3    | Factory layer (52 factories, primitives) | 78    |
| 4    | Module layer (60+ modules, Saga runtime) | 82    |
| 5    | Production polish (this wave)            | 82    |

## Layer overview (Wave 5)

seeds/
├── strategies/ ← 8 declarative scenario presets
├── anonymization/ ← 10 PII detection + masking + audit
├── exporters/ ← 12 JSONL/CSV/Parquet/S3/pg_dump/BQ/FT
├── e2e-harness/ ← 10 TestContainers + Vitest fixtures + golden
├── cli/ ← 10 Commander root + 8 subcommands
├── load-chaos/ ← 8 K6 scripts + chaos scenarios
├── production-polish/ ← 10 Sentry + Better Stack + Prometheus + secrets
└── docs/ ← 8 README + ARCHITECTURE + RUNBOOK + ...

## Execution flow

CLI (Commander)
└─> Strategy resolver
└─> Saga orchestrator (Wave 4)
├─> Health check (Wave 5)
├─> Secret validation (Wave 5)
├─> Module DAG topo sort (Wave 4)
├─> Level-parallel execution (Wave 4)
│ ├─> Reference catalogs (Waves 2, 4)
│ ├─> Identity / Organization / People / Clinical (Wave 4)
│ └─> Compliance / AI-Ops / Commerce / ... (Wave 4)
├─> Checkpoint engine (Wave 4)
├─> Compensation engine on failure (Wave 4)
└─> Telemetry → Prometheus + Better Stack + Sentry (Wave 5)
└─> Optional anonymization (Wave 5)
└─> Optional exports (Wave 5)
└─> Optional snapshot (Wave 4)

## Key design decisions

**Saga-based orchestration.** Each module declares an idempotency check, a `run` function, and an optional `compensate` rollback. On failure, completed modules are rolled back in reverse order. Source synthesis: AWS Saga + Temporal durable execution.

**Parallel-level execution.** The DAG is grouped into levels via Kahn's BFS; modules in the same level execute concurrently. Source: Apache Airflow.

**COPY-based bulk loading.** Hot-path tables (analytics, audit) use PostgreSQL COPY via streaming for 10–100× speedup over `createMany`. Source: Citus, pganalyze.

**Deterministic anonymization.** SHA-3 + global salt produces same input → same output, preserving foreign-key integrity across tables. Source: Greenmask.

**Hermetic E2E.** TestContainers Postgres with template-database snapshot/restore for per-test clean state. Source: testcontainers/postgres-module.

**Compliance-by-design.** DPDP / HIPAA Safe Harbor / GDPR rule sets are first-class; k-anonymity validation runs alongside masking.

## Data scale (load-test scenario)

| Entity             | Count    |
| ------------------ | -------- |
| Reference salts    | 80+      |
| ICD-10 conditions  | 100+     |
| Archetypes         | 50       |
| Clinics            | 500      |
| Doctors            | 2 000    |
| Patients           | 100 000  |
| Consultations      | 100 000  |
| Messages           | ~1.5 M   |
| Appointments       | 30 000   |
| Historical records | 365 days |

## Module count by category (Wave 4)

| Category     | Modules |
| ------------ | ------- |
| reference    | 4       |
| identity     | 5       |
| organization | 4       |
| people       | 4       |
| clinical     | 11      |
| operational  | 7       |
| compliance   | 4       |
| ai-ops       | 4       |
| commerce     | 5       |
| integrations | 3       |
| support      | 3       |
| marketing    | 3       |
| analytics    | 4       |
| time-travel  | 2       |
| scenarios    | 3       |
| **Total**    | **66**  |

## Forward compatibility (2026 → 2031)

- **Schema evolution.** Each module declares a `version` field; schema diffs trigger module-version bumps.
- **New compliance regimes.** Add a rule-set file alongside `dpdp-rules.ts`; the engine accepts new `ComplianceProfile` strings without code changes elsewhere.
- **New export formats.** Implement a class with the `export(opts)` contract; register it in the CLI.
- **New module categories.** Add to `ModuleCategory` union; modules opt in via the `category` field.
- **Provider failover.** AI provider chain (Claude → GPT-4 → Gemini) is data-driven via env keys.
