import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { applyIdempotencyStrategy } from '../../../../prisma/seeds/modules/core/module-helpers';
import { defineModule } from '../../../../prisma/seeds/modules/core';
import type { ModuleContext } from '../../../../prisma/seeds/modules/core/module.types';
import { ALL_FACTORIES_V2 } from '../../../../prisma/seeds/factories';

const mockCtx = (prismaMock: object): ModuleContext => ({
  prisma: prismaMock as PrismaClient,
  factories: ALL_FACTORIES_V2,
  masterSeed: 42,
  env: 'test',
  scenario: 'test',
  runId: 'r1',
  tenantContext: null,
  completedModules: new Set(),
  registry: {
    set: vi.fn(),
    get: vi.fn(),
    getRequired: vi.fn(),
    has: () => false,
    keys: () => [],
    reset: () => {},
    snapshot: () => ({}),
  },
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => mockCtx({}).logger,
  },
  saveCheckpoint: async () => {},
  abortSignal: new AbortController().signal,
  dryRun: false,
});

describe('Idempotency Strategies', () => {
  it('NEVER strategy returns false', async () => {
    const m = defineModule({
      name: 'never',
      description: '',
      category: 'reference',
      dependencies: [],
      idempotencyStrategy: { kind: 'NEVER' },
      run: async () => ({}) as never,
    });
    expect(await applyIdempotencyStrategy(m, mockCtx({}))).toBe(false);
  });

  it('COUNT_THRESHOLD returns true if count >= threshold', async () => {
    const m = defineModule({
      name: 'count',
      description: '',
      category: 'reference',
      dependencies: [],
      idempotencyStrategy: { kind: 'COUNT_THRESHOLD', modelName: 'medicationSalt', threshold: 80 },
      run: async () => ({}) as never,
    });
    const ctx = mockCtx({ medicationSalt: { count: async () => 80 } });
    expect(await applyIdempotencyStrategy(m, ctx)).toBe(true);
  });

  it('COUNT_THRESHOLD returns false if count < threshold', async () => {
    const m = defineModule({
      name: 'count',
      description: '',
      category: 'reference',
      dependencies: [],
      idempotencyStrategy: { kind: 'COUNT_THRESHOLD', modelName: 'medicationSalt', threshold: 80 },
      run: async () => ({}) as never,
    });
    const ctx = mockCtx({ medicationSalt: { count: async () => 50 } });
    expect(await applyIdempotencyStrategy(m, ctx)).toBe(false);
  });

  it('CUSTOM strategy delegates to check fn', async () => {
    const checkFn = vi.fn().mockResolvedValue(true);
    const m = defineModule({
      name: 'custom',
      description: '',
      category: 'reference',
      dependencies: [],
      idempotencyStrategy: { kind: 'CUSTOM', check: checkFn },
      run: async () => ({}) as never,
    });
    expect(await applyIdempotencyStrategy(m, mockCtx({}))).toBe(true);
    expect(checkFn).toHaveBeenCalled();
  });
});
