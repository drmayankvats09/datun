// ═══════════════════════════════════════════════════════════════
// MODULE HELPERS v2 — Shared utilities for every module
// ═══════════════════════════════════════════════════════════════

import { performance } from 'node:perf_hooks';
import type { PrismaClient } from '@prisma/client';
import { SeedFailureError } from '../../errors';
import type {
  BulkStrategy,
  IdempotencyStrategy,
  ModuleContext,
  ModuleResult,
  ModuleStatus,
  SeedModule,
} from './module.types';
import { SEED_ERROR_CODES, seedError } from '@seeds/factories/core/error-codes';

/** Define a module with sane defaults — single source of truth */
export function defineModule(
  options: Partial<SeedModule> &
    Pick<SeedModule, 'name' | 'description' | 'category' | 'dependencies' | 'run'>,
): SeedModule {
  return {
    version: '2.0.0',
    providesRegistryKeys: [],
    consumesRegistryKeys: [],
    modelsTouched: [],
    factoriesUsed: [],
    bulkStrategy: 'CREATE_MANY' as BulkStrategy,
    idempotencyStrategy: { kind: 'NEVER' } as unknown as IdempotencyStrategy,
    useTransaction: true,
    transactionTimeoutMs: 60_000,
    allowedEnvironments: ['development', 'test', 'staging'],
    tenantScoped: false,
    piiSensitive: false,
    checkpointEveryNBatches: 5,
    maxRetries: 3,
    retryBackoffMs: 1000,
    checkIdempotency: async () => false,
    ...options,
  } as unknown as SeedModule;
}

/** Environment guard */
export function environmentGuard(module: SeedModule, ctx: ModuleContext): void {
  if (!module.allowedEnvironments.includes(ctx.env)) {
    throw seedError(
      SEED_ERROR_CODES.MODULE_NOT_ALLOWED,
      `Module "${module.name}" not allowed in env "${ctx.env}"`,
      { module: module.name, meta: { env: ctx.env } },
    );
  }
}

/** Apply idempotency strategy */
export async function applyIdempotencyStrategy(
  module: SeedModule,
  ctx: ModuleContext,
): Promise<boolean> {
  const strategy = module.idempotencyStrategy;
  switch (strategy.kind) {
    case 'NEVER':
      return false;
    case 'COUNT_THRESHOLD': {
      const model = (ctx.prisma as unknown as Record<string, { count: () => Promise<number> }>)[
        strategy.modelName as string
      ];
      if (!model) return false;
      const count = await model.count();
      return count >= strategy.threshold;
    }
    case 'TOKEN_LOOKUP': {
      // Look up SeedRunHistory for this module + token
      const history = await (
        ctx.prisma as unknown as {
          seedRunHistory?: { findFirst: (args: object) => Promise<unknown> };
        }
      ).seedRunHistory?.findFirst({
        where: {
          moduleName: module.name,
          idempotencyToken: strategy.tokenKey,
          status: 'COMPLETED',
        },
      });
      return !!history;
    }
    case 'EXISTS_BY_ID': {
      const model = (
        ctx.prisma as unknown as Record<string, { findFirst: (args: object) => Promise<unknown> }>
      )[strategy.modelName as string];
      if (!model) return false;
      const found = await model.findFirst({ where: { id: { startsWith: strategy.idPattern } } });
      return !!found;
    }
    case 'CUSTOM':
      return strategy.check(ctx);
  }
}

/** Wrap module run with measurement + error handling */
export async function measureExecution(
  module: SeedModule,
  ctx: ModuleContext,
  fn: () => Promise<Omit<ModuleResult, 'moduleName' | 'durationMs' | 'status' | 'memoryPeakMb'>>,
  finalStatus: ModuleStatus = 'COMPLETED',
): Promise<ModuleResult> {
  const start = performance.now();
  const memBefore = process.memoryUsage().heapUsed;
  let memPeak = memBefore;
  const memMonitor = setInterval(() => {
    memPeak = Math.max(memPeak, process.memoryUsage().heapUsed);
  }, 100);

  try {
    const partial = await fn();
    clearInterval(memMonitor);
    return {
      ...partial,
      moduleName: module.name,
      durationMs: performance.now() - start,
      status: finalStatus,
      memoryPeakMb: (memPeak - memBefore) / 1024 / 1024,
    };
  } catch (e) {
    clearInterval(memMonitor);
    const err = e instanceof Error ? e : new Error(String(e));
    ctx.logger.error(`Module ${module.name} FAILED`, { error: err.message, stack: err.stack });
    return {
      moduleName: module.name,
      status: 'FAILED',
      recordsCreated: 0,
      recordsSkipped: 0,
      recordsFailed: 1,
      recordsCompensated: 0,
      durationMs: performance.now() - start,
      factoriesUsed: module.factoriesUsed,
      modelsTouched: module.modelsTouched,
      bulkStrategy: module.bulkStrategy,
      checkpointsSaved: 0,
      memoryPeakMb: (memPeak - memBefore) / 1024 / 1024,
      error: { message: err.message, stack: err.stack, code: (err as { code?: string }).code },
      metadata: {},
    };
  }
}

/** Run module body inside transaction if configured */
export async function runInScope<T>(
  module: SeedModule,
  ctx: ModuleContext,
  body: (prisma: PrismaClient) => Promise<T>,
): Promise<T> {
  if (!module.useTransaction || ctx.dryRun) {
    return body(ctx.prisma);
  }
  return ctx.prisma.$transaction(async (tx) => body(tx as PrismaClient), {
    timeout: module.transactionTimeoutMs,
    maxWait: 30_000,
  });
}

/** Retry helper with exponential backoff */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseMs?: number;
    logger?: ModuleContext['logger'];
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const max = options.maxAttempts ?? 3;
  const base = options.baseMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= max; attempt++) {
    if (options.signal?.aborted) throw new Error('Operation aborted');
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === max) break;
      const wait = base * Math.pow(2, attempt - 1) + Math.random() * 100;
      options.logger?.warn(`Retry attempt ${attempt} after ${wait}ms`, { error: String(e) });
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastError;
}

/** Estimate dry-run cost */
export function estimateBulkCost(
  recordCount: number,
  strategy: BulkStrategy,
): { ms: number; mb: number } {
  switch (strategy) {
    case 'COPY_STREAM':
      return { ms: recordCount * 0.05, mb: recordCount / 10000 };
    case 'CREATE_MANY':
      return { ms: recordCount * 0.5, mb: recordCount / 5000 };
    case 'NESTED_TRANSACTION':
      return { ms: recordCount * 2, mb: recordCount / 2000 };
    case 'TRANSACTIONAL_LOOP':
      return { ms: recordCount * 10, mb: recordCount / 1000 };
  }
}
