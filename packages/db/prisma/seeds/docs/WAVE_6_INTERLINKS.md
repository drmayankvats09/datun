# Wave 6 Interlinks — Verified Cross-Wave Contract Reference

This document is the **single source of truth** for every cross-wave import in Wave 6 / 6.1. Every entry was verified against the actual Wave 1-5 source code in `latest_chat_waves.txt`. Future waves must consult this before reaching across boundaries.

## Wave 4 → Wave 6 contracts

### Orchestrator entry point

```typescript
import { runMainOrchestrator } from '../modules/orchestrator/main-orchestrator';
```

| Field                 | Type                                           | Notes                      |
| --------------------- | ---------------------------------------------- | -------------------------- |
| `prisma`              | `PrismaClient`                                 | required                   |
| `env`                 | `'development' \| 'staging' \| 'test'`         | required                   |
| `scenario`            | `'minimal' \| 'demo' \| 'load-test' \| 'full'` | optional                   |
| `masterSeed`          | `number`                                       | optional, defaults 42      |
| `tenantContext`       | `TenantContext \| undefined`                   | per-tenant scoping         |
| `resumeFromRunId`     | `string \| undefined`                          | NOT `resumeFromCheckpoint` |
| `dryRun`              | `boolean`                                      | optional                   |
| `parallelExec`        | `boolean`                                      | optional                   |
| `stopOnError`         | `boolean`                                      | optional                   |
| `compensateOnFailure` | `boolean`                                      | optional                   |
| `printManifestFirst`  | `boolean`                                      | optional                   |
| `abortSignal`         | `AbortSignal`                                  | cooperative cancellation   |
| `includeModuleNames`  | `readonly string[]`                            | filter                     |
| `excludeModuleNames`  | `readonly string[]`                            | filter                     |
| `includeCategories`   | `readonly ModuleCategory[]`                    | filter                     |
| `excludeCategories`   | `readonly ModuleCategory[]`                    | filter                     |

Returns `Promise<OrchestratorRunResult>` with status enum `'COMPLETED' \| 'PARTIAL' \| 'FAILED' \| 'COMPENSATED'`.

### Saga orchestrator class

```typescript
import { SagaOrchestrator, type OrchestratorConfig } from '../modules/runtime/saga-orchestrator';
```

`OrchestratorConfig.onModuleStatusChange(module, status, result?)` is the hook used by chaos injector and audit wiring. Status enum: `'PENDING' \| 'RUNNING' \| 'COMPLETED' \| 'SKIPPED' \| 'FAILED'`.

### Tenant context

```typescript
import type { TenantContext } from '../modules/core/module.types';
```

```typescript
{
  readonly clinicId: string;
  readonly clinicSlug: string;
  readonly defaultLocale: 'hindi' | 'english' | 'punjabi' | 'bengali' | 'tamil' | 'telugu' | 'marathi' | 'gujarati';
  readonly timezone: string;
  readonly cityName: string;
}
```

## Wave 3 v2 → Wave 6 contracts

```typescript
import { ALL_FACTORIES_V2, type FactoryRegistryV2 } from '../factories';
```

The registry name is `ALL_FACTORIES_V2` (not `ALL_FACTORIES`). Each factory exposes a `build()` method returning a Prisma-acceptable shape.

## Wave 5 → Wave 6 contracts

### Anonymization

```typescript
import {
  AnonymizationEngine,
  type ComplianceProfile,
  validateKAnonymity,
  detectPiiInValue,
  detectPiiFields,
} from '../anonymization';
```

`ComplianceProfile = 'DPDP' | 'HIPAA' | 'GDPR' | 'DPDP_HIPAA' | 'DPDP_HIPAA_GDPR'`.

`AnonymizationEngine` constructor: `new AnonymizationEngine(profile?, { quasiIdentifiers?, kThreshold? })`.

API: `anonymizeRecord(modelName, record)`, `anonymizeRecords(modelName, records, opts)`.

### File-based audit (legacy, replaced in Wave 6 by DB-backed `SeedAuditLog`)

```typescript
import { writeAuditEntry, readAuditEntriesForDate, type AuditEntry } from '../anonymization';
```

Wave 6's `AuditWriter` reads these legacy JSONL files and migrates them to the DB-backed table via `migrateFileAuditToDb`.

### Strategies

```typescript
import {
  ALL_STRATEGIES,
  resolveStrategy,
  type StrategyName,
  type StrategySpec,
} from '../strategies';
```

The registry name is `ALL_STRATEGIES` (not `allStrategies`). Eight presets: `minimal`, `demo`, `staging`, `load-test`, `e2e-test`, `perf-bench`, `regression`, `recovery`.

### CLI

```typescript
import { buildProgram, runCli } from '../cli/program';
```

Wave 6.1's `registerWave6Commands(program)` is invoked **after** Wave 5's `registerXxxCommand(program)` calls inside `buildProgram()`.

## Wave 6 internal contracts

| Surface        | Path                         | Notes                                                                                              |
| -------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Probes         | `seeds/probes`               | `runProbes`, `verifyAll`, `verifyByName`, `ALL_PROBES`                                             |
| DB audit       | `seeds/audit-db`             | `AuditWriter`, `verifyAuditChain`, `applyRetentionPolicy`, `queryAuditLog`, `migrateFileAuditToDb` |
| Bulk loader    | `seeds/bulk-loader`          | `copyLoad`, `writeParquet`, `readParquet`, `autoLoad`                                              |
| Load bench     | `seeds/load-bench`           | `SloMonitor`, `MemoryProfiler`, `injectChaos`, `runChaosSuite`, `dispatchChaosFailure`             |
| Drift detector | `seeds/drift-detector`       | `detectDrift`, `diffSnapshots`, `getInstrumentedClient`                                            |
| Multi-tenant   | `seeds/multi-tenant`         | `runTenantOrchestrator`, `withTenantBlocker`, `engineForTenant`                                    |
| Compat matrix  | `seeds/compat-matrix`        | `runPgMatrix`, `checkCompatibility`                                                                |
| DR + replica   | `seeds/dr-replica`           | `drRestore`, `runDrDrill`, `validateRecovery`, `ReplicaRouter`, `checkReplicaLag`                  |
| ε-DP           | `seeds/differential-privacy` | `computeEpsilon`, `validateForCompliance`                                                          |
| OTEL           | `seeds/observability`        | `initOtel`, `withSpan`, `withOtelTracing`                                                          |
| Validation     | `seeds/validation`           | `withTestDb`, `flakeRegistry`, property/unit/e2e/contracts/golden suites                           |

## Maintenance rules

1. Any new Wave (7+) must add an entry to this document **before** writing the first import.
2. Renaming any export above requires a PR that updates this document and every consumer in the same commit.
3. CI workflow `seed-comprehensive-validate` runs `tsc --noEmit` against this exact contract.
