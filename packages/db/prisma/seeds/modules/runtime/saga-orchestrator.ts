// ═══════════════════════════════════════════════════════════════
// SAGA ORCHESTRATOR — Top-level execution engine
//
// Source synthesis: AWS Saga + Temporal + Apache Airflow
// Features: parallel-level execution, checkpoint resume, compensation
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import type { FactoryRegistryV2 } from '../../factories';
import type {
  Environment,
  ModuleContext,
  ModuleLogger,
  ModuleResult,
  ModuleStatus,
  SeedModule,
  TenantContext,
} from '../core/module.types';
import { applyIdempotencyStrategy, environmentGuard } from '../core/module-helpers';
import { groupByDependencyLevel, topologicalSort } from '../core/dependency-graph';
import { createLogger } from '../core/logger';
import { createModuleRegistry } from '../core/module-registry';
import { recordModuleResult } from '../core/telemetry';
import { CheckpointEngine } from './checkpoint-engine';
import { CompensationEngine } from './compensation-engine';
import { SeedRunHistoryStore } from './run-history';

export interface OrchestratorConfig {
  readonly prisma: PrismaClient;
  readonly factories: FactoryRegistryV2;
  readonly modules: readonly SeedModule[];
  readonly env: Environment;
  readonly scenario: string;
  readonly masterSeed: number;
  readonly tenantContext?: TenantContext;
  readonly resumeFromRunId?: string;
  readonly dryRun?: boolean;
  readonly parallelExec?: boolean;
  readonly stopOnError?: boolean;
  readonly compensateOnFailure?: boolean;
  readonly logger?: ModuleLogger;
  readonly abortSignal?: AbortSignal;
  readonly onModuleStatusChange?: (
    module: SeedModule,
    status: ModuleStatus,
    result?: ModuleResult,
  ) => void;
}

export interface OrchestratorRunResult {
  readonly runId: string;
  readonly status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'COMPENSATED';
  readonly totalModules: number;
  readonly completedCount: number;
  readonly skippedCount: number;
  readonly failedCount: number;
  readonly compensatedCount: number;
  readonly totalRecordsCreated: number;
  readonly totalDurationMs: number;
  readonly results: readonly ModuleResult[];
  readonly registrySnapshot: Readonly<Record<string, unknown>>;
}

export class SagaOrchestrator {
  private readonly logger: ModuleLogger;
  private readonly checkpointEngine: CheckpointEngine;
  private readonly compensationEngine: CompensationEngine;
  private readonly historyStore: SeedRunHistoryStore;

  constructor(private readonly config: OrchestratorConfig) {
    this.logger =
      config.logger ?? createLogger({ component: 'orchestrator', scenario: config.scenario });
    this.checkpointEngine = new CheckpointEngine(config.prisma);
    this.compensationEngine = new CompensationEngine(this.logger);
    this.historyStore = new SeedRunHistoryStore(config.prisma);
  }

  async execute(): Promise<OrchestratorRunResult> {
    const startTime = Date.now();
    const runId =
      this.config.resumeFromRunId ?? `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    this.logger.info('🏁 Saga orchestrator starting', {
      runId,
      modules: this.config.modules.length,
      env: this.config.env,
      scenario: this.config.scenario,
      dryRun: this.config.dryRun ?? false,
      tenant: this.config.tenantContext?.clinicId ?? 'global',
    });

    // 1. Topological sort + level grouping
    const sortedModules = topologicalSort(this.config.modules);
    const levels = groupByDependencyLevel(this.config.modules);

    // 2. Persist run start
    await this.historyStore.startRun({
      runId,
      env: this.config.env,
      scenario: this.config.scenario,
      moduleCount: sortedModules.length,
      tenantId: this.config.tenantContext?.clinicId ?? null,
    });

    const registry = createModuleRegistry();

    // 3. Resume from checkpoint if provided
    if (this.config.resumeFromRunId) {
      const checkpoint = await this.checkpointEngine.loadLatestCheckpoint(
        this.config.resumeFromRunId,
      );
      if (checkpoint) {
        registry.loadSnapshot(checkpoint.registrySnapshot as Record<string, unknown>);
        this.logger.info('🔁 Resumed from checkpoint', {
          checkpoint: checkpoint.moduleName,
          batchIndex: checkpoint.batchIndex,
        });
      }
    }

    const completedModules = new Set<string>();
    const allResults: ModuleResult[] = [];
    const successfulResults: ModuleResult[] = []; // for compensation reverse-order
    let aborted = false;

    // 4. Execute level by level
    for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
      const level = levels[levelIdx]!;
      this.logger.info(`📦 Level ${levelIdx + 1}/${levels.length}`, {
        modules: level.map((m) => m.name),
      });

      const levelResults = this.config.parallelExec
        ? await Promise.all(
            level.map((m) => this.executeModule(m, runId, completedModules, registry, allResults)),
          )
        : await this.executeSequential(level, runId, completedModules, registry, allResults);

      for (const result of levelResults) {
        allResults.push(result);
        recordModuleResult(result);
        completedModules.add(result.moduleName);

        if (result.status === 'COMPLETED') {
          successfulResults.push(result);
          this.config.onModuleStatusChange?.(
            this.config.modules.find((m) => m.name === result.moduleName)!,
            'COMPLETED',
            result,
          );
        } else if (result.status === 'FAILED') {
          this.logger.error(`Module ${result.moduleName} FAILED`, { error: result.error });
          this.config.onModuleStatusChange?.(
            this.config.modules.find((m) => m.name === result.moduleName)!,
            'FAILED',
            result,
          );

          if (this.config.stopOnError !== false) {
            aborted = true;
            break;
          }
        }

        if (this.config.abortSignal?.aborted) {
          this.logger.warn('⛔ Orchestrator aborted via signal');
          aborted = true;
          break;
        }
      }

      if (aborted) break;
    }

    // 5. Compensate on failure if configured
    if (aborted && this.config.compensateOnFailure !== false && !this.config.dryRun) {
      this.logger.warn('🔄 Compensating successful modules in reverse order');
      await this.compensationEngine.compensate(
        successfulResults,
        this.config.modules,
        this.buildContext(runId, completedModules, registry, allResults),
      );
    }

    const totalRecordsCreated = allResults.reduce((s, r) => s + r.recordsCreated, 0);
    const completedCount = allResults.filter((r) => r.status === 'COMPLETED').length;
    const skippedCount = allResults.filter((r) => r.status === 'SKIPPED').length;
    const failedCount = allResults.filter((r) => r.status === 'FAILED').length;
    const compensatedCount = allResults.filter((r) => r.status === 'ROLLED_BACK').length;

    const finalStatus: OrchestratorRunResult['status'] =
      aborted && this.config.compensateOnFailure !== false
        ? 'COMPENSATED'
        : aborted
          ? 'PARTIAL'
          : failedCount > 0
            ? 'PARTIAL'
            : 'COMPLETED';

    await this.historyStore.completeRun({
      runId,
      status: finalStatus,
      totalDurationMs: Date.now() - startTime,
      totalRecordsCreated,
    });

    const result: OrchestratorRunResult = {
      runId,
      status: finalStatus,
      totalModules: sortedModules.length,
      completedCount,
      skippedCount,
      failedCount,
      compensatedCount,
      totalRecordsCreated,
      totalDurationMs: Date.now() - startTime,
      results: allResults,
      registrySnapshot: registry.snapshot(),
    };

    this.logger.info('🏁 Saga orchestrator complete', {
      status: finalStatus,
      completed: completedCount,
      skipped: skippedCount,
      failed: failedCount,
      records: totalRecordsCreated,
      durationSec: ((Date.now() - startTime) / 1000).toFixed(2),
    });

    return result;
  }

  private async executeSequential(
    level: readonly SeedModule[],
    runId: string,
    completed: Set<string>,
    registry: ReturnType<typeof createModuleRegistry>,
    results: ModuleResult[],
  ): Promise<ModuleResult[]> {
    const out: ModuleResult[] = [];
    for (const m of level) {
      out.push(await this.executeModule(m, runId, completed, registry, results));
    }
    return out;
  }

  private async executeModule(
    module: SeedModule,
    runId: string,
    completed: Set<string>,
    registry: ReturnType<typeof createModuleRegistry>,
    priorResults: readonly ModuleResult[],
  ): Promise<ModuleResult> {
    const ctx = this.buildContext(runId, completed, registry, priorResults);
    const childLogger = ctx.logger.child({ module: module.name });

    try {
      // 1. Environment check
      environmentGuard(module, ctx);

      // 2. Idempotency check
      this.config.onModuleStatusChange?.(module, 'CHECKING_IDEMPOTENCY');
      const isIdempotent = await applyIdempotencyStrategy(module, ctx);
      if (isIdempotent) {
        // Hydrate registry from DB so downstream modules can still consume our keys
        // even when our run() is skipped. Without this, a re-run with idempotent
        // upstream modules causes downstream modules to crash on missing registry keys.
        if (module.hydrateRegistry) {
          try {
            await module.hydrateRegistry(ctx);
          } catch (hydrateErr) {
            childLogger.error('Registry hydration failed during skip — downstream may break', {
              error: hydrateErr instanceof Error ? hydrateErr.message : String(hydrateErr),
            });
          }
        }
        childLogger.info('⏭️  Skipped via idempotency');
        this.config.onModuleStatusChange?.(module, 'SKIPPED');
        return {
          moduleName: module.name,
          status: 'SKIPPED',
          recordsCreated: 0,
          recordsSkipped: 1,
          recordsFailed: 0,
          recordsCompensated: 0,
          durationMs: 0,
          factoriesUsed: module.factoriesUsed,
          modelsTouched: module.modelsTouched,
          bulkStrategy: module.bulkStrategy,
          checkpointsSaved: 0,
          memoryPeakMb: 0,
          metadata: { reason: 'idempotency-pass' },
        };
      }

      // 3. Dry-run mode
      if (this.config.dryRun) {
        this.config.onModuleStatusChange?.(module, 'DRY_RUN');
        childLogger.info('🔍 Dry-run mode');
        const estimate = module.dryRun
          ? await module.dryRun(ctx)
          : {
              wouldCreate: 0,
              wouldSkip: 0,
              estimatedDurationMs: 0,
              estimatedMemoryMb: 0,
              factoriesNeeded: [],
              modelsTouched: [],
            };
        return {
          moduleName: module.name,
          status: 'COMPLETED',
          recordsCreated: 0,
          recordsSkipped: estimate.wouldSkip,
          recordsFailed: 0,
          recordsCompensated: 0,
          durationMs: estimate.estimatedDurationMs,
          factoriesUsed: module.factoriesUsed,
          modelsTouched: module.modelsTouched,
          bulkStrategy: module.bulkStrategy,
          checkpointsSaved: 0,
          memoryPeakMb: estimate.estimatedMemoryMb,
          metadata: { dryRun: true, wouldCreate: estimate.wouldCreate },
        };
      }

      // 4. Run
      this.config.onModuleStatusChange?.(module, 'RUNNING');
      const result = await module.run(ctx);

      // 5. Persist module-specific status
      await this.historyStore.recordModuleResult(runId, result);

      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      childLogger.error('Module execution threw', { error: err.message, stack: err.stack });
      return {
        moduleName: module.name,
        status: 'FAILED',
        recordsCreated: 0,
        recordsSkipped: 0,
        recordsFailed: 1,
        recordsCompensated: 0,
        durationMs: 0,
        factoriesUsed: module.factoriesUsed,
        modelsTouched: module.modelsTouched,
        bulkStrategy: module.bulkStrategy,
        checkpointsSaved: 0,
        memoryPeakMb: 0,
        error: { message: err.message, stack: err.stack },
        metadata: {},
      };
    }
  }

  private buildContext(
    runId: string,
    completed: Set<string>,
    registry: ReturnType<typeof createModuleRegistry>,
    _priorResults: readonly ModuleResult[],
  ): ModuleContext {
    return {
      prisma: this.config.prisma,
      factories: this.config.factories,
      masterSeed: this.config.masterSeed,
      env: this.config.env,
      scenario: this.config.scenario,
      runId,
      tenantContext: this.config.tenantContext ?? null,
      completedModules: completed,
      registry,
      logger: this.logger,
      saveCheckpoint: async (batchIndex, recordsProcessed) => {
        await this.checkpointEngine.save({
          moduleName: 'in-progress',
          runId,
          batchIndex,
          recordsProcessed,
          registrySnapshot: registry.snapshot(),
          checkpointedAt: new Date(),
        });
      },
      abortSignal: this.config.abortSignal ?? new AbortController().signal,
      dryRun: this.config.dryRun ?? false,
    };
  }
}
