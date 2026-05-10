// ═══════════════════════════════════════════════════════════════
// SEED MODULE CONTRACT v2 — Saga + Temporal-inspired
// Sources: AWS Saga (compensating tx), Temporal (durable exec),
//          Apache Airflow (DAG), Rails seedbank (declarative deps)
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import type { FactoryRegistryV2 } from '../../factories';

/** Module execution status — finite state machine */
export type ModuleStatus =
  | 'PENDING'
  | 'WAITING_DEPENDENCIES'
  | 'CHECKING_IDEMPOTENCY'
  | 'DRY_RUN'
  | 'RUNNING'
  | 'CHECKPOINTING'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'FAILED'
  | 'COMPENSATING'
  | 'ROLLED_BACK'
  | 'TIMED_OUT'
  | 'CANCELLED';

/** Module category — for CLI filtering */
export type ModuleCategory =
  | 'reference'
  | 'identity'
  | 'organization'
  | 'people'
  | 'clinical'
  | 'operational'
  | 'compliance'
  | 'ai-ops'
  | 'commerce'
  | 'integrations'
  | 'support'
  | 'marketing'
  | 'analytics'
  | 'time-travel'
  | 'scenarios'
  | 'relationships';

/** Module name — unique across system */
export type ModuleName = string;

/** Idempotency strategy */
export type IdempotencyStrategy =
  | { kind: 'COUNT_THRESHOLD'; modelName: keyof PrismaClient; threshold: number }
  | { kind: 'TOKEN_LOOKUP'; tokenKey: string }
  | { kind: 'EXISTS_BY_ID'; modelName: keyof PrismaClient; idPattern: string }
  | { kind: 'CUSTOM'; check: (ctx: ModuleContext) => Promise<boolean> }
  | { kind: 'NEVER' };

/** Bulk insert strategy — drives Prisma createMany vs COPY decision */
export type BulkStrategy =
  | 'CREATE_MANY' // standard Prisma createMany batched
  | 'COPY_STREAM' // pg-copy-streams for hot tables (100K+)
  | 'TRANSACTIONAL_LOOP' // upsert per record (slow, only for FK-heavy)
  | 'NESTED_TRANSACTION'; // $transaction for related entities

/** Allowed environments */
export type Environment = 'development' | 'test' | 'staging' | 'production';

/** Logger interface */
export interface ModuleLogger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): ModuleLogger;
}

/** Cross-module data sharing registry */
export interface ModuleRegistry {
  set<T>(key: string, value: T): void;
  get<T>(key: string): T | undefined;
  getRequired<T>(key: string): T;
  has(key: string): boolean;
  keys(): readonly string[];
  reset(): void;
  snapshot(): Readonly<Record<string, unknown>>;
}

/** Tenant scope for per-clinic seeding */
export interface TenantContext {
  readonly clinicId: string;
  readonly clinicSlug: string;
  readonly defaultLocale:
    | 'hindi'
    | 'english'
    | 'punjabi'
    | 'bengali'
    | 'tamil'
    | 'telugu'
    | 'marathi'
    | 'gujarati';
  readonly timezone: string;
  readonly cityName: string;
}

/** Checkpoint — saved state mid-run for resume */
export interface ModuleCheckpoint {
  readonly moduleName: ModuleName;
  readonly runId: string;
  readonly batchIndex: number;
  readonly recordsProcessed: number;
  readonly registrySnapshot: Readonly<Record<string, unknown>>;
  readonly checkpointedAt: Date;
}

/** Execution context passed to every module */
export interface ModuleContext {
  readonly prisma: PrismaClient;
  readonly factories: FactoryRegistryV2;
  readonly masterSeed: number;
  readonly env: Environment;
  readonly scenario: string;
  readonly runId: string;
  readonly tenantContext: TenantContext | null;
  readonly completedModules: ReadonlySet<ModuleName>;
  readonly registry: ModuleRegistry;
  readonly logger: ModuleLogger;
  readonly checkpointFromPrevious?: ModuleCheckpoint;
  /** Save a checkpoint mid-run */
  readonly saveCheckpoint: (batchIndex: number, recordsProcessed: number) => Promise<void>;
  /** Abort signal for cooperative cancellation */
  readonly abortSignal: AbortSignal;
  /** Dry-run flag — modules must respect this */
  readonly dryRun: boolean;
}

/** Module run result */
export interface ModuleResult {
  readonly moduleName: ModuleName;
  readonly status: ModuleStatus;
  readonly recordsCreated: number;
  readonly recordsSkipped: number;
  readonly recordsFailed: number;
  readonly recordsCompensated: number;
  readonly durationMs: number;
  readonly factoriesUsed: readonly string[];
  readonly modelsTouched: readonly string[];
  readonly bulkStrategy: BulkStrategy;
  readonly checkpointsSaved: number;
  readonly memoryPeakMb: number;
  readonly error?: { message: string; stack?: string; code?: string };
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Compensation function — undoes module's effects */
export type CompensationFn = (ctx: ModuleContext, result: ModuleResult) => Promise<void>;

/** Dry-run result — what WOULD happen */
export interface DryRunResult {
  readonly wouldCreate: number;
  readonly wouldSkip: number;
  readonly estimatedDurationMs: number;
  readonly estimatedMemoryMb: number;
  readonly factoriesNeeded: readonly string[];
  readonly modelsTouched: readonly string[];
}

/** SeedModule v2 contract */
export interface SeedModule {
  readonly name: ModuleName;
  readonly description: string;
  readonly category: ModuleCategory;
  readonly version: string;
  readonly dependencies: readonly ModuleName[];
  readonly providesRegistryKeys: readonly string[];
  readonly consumesRegistryKeys: readonly string[];
  readonly modelsTouched: readonly string[];
  readonly factoriesUsed: readonly string[];
  readonly bulkStrategy: BulkStrategy;
  readonly idempotencyStrategy: IdempotencyStrategy;
  readonly useTransaction: boolean;
  readonly transactionTimeoutMs: number;
  readonly allowedEnvironments: readonly Environment[];
  readonly tenantScoped: boolean;
  readonly piiSensitive: boolean;
  readonly checkpointEveryNBatches: number;
  readonly maxRetries: number;
  readonly retryBackoffMs: number;

  /** Idempotency check — orchestrator skips if true */
  readonly checkIdempotency: (ctx: ModuleContext) => Promise<boolean>;
  /** Main seed function */
  readonly run: (ctx: ModuleContext) => Promise<ModuleResult>;
  /**
   * Re-populate this module's registry keys from DB when run() is skipped via idempotency.
   * Required for downstream modules that consume this module's keys to work on re-runs.
   * If omitted, registry will be empty when this module is skipped.
   */
  readonly hydrateRegistry?: (ctx: ModuleContext) => Promise<void>;
  /** Compensating action for saga rollback */
  readonly compensate?: CompensationFn;
  /** Dry-run estimator */
  readonly dryRun?: (ctx: ModuleContext) => Promise<DryRunResult>;
}
