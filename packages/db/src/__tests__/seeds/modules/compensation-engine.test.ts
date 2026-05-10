import { describe, it, expect } from 'vitest';
import { CompensationEngine } from '../../../../prisma/seeds/modules/runtime/compensation-engine';
import { createLogger } from '../../../../prisma/seeds/modules/core/logger';
import { defineModule } from '../../../../prisma/seeds/modules/core';
import type {
  ModuleContext,
  ModuleResult,
} from '../../../../prisma/seeds/modules/core/module.types';

describe('CompensationEngine', () => {
  it('compensates in reverse order', async () => {
    const order: string[] = [];

    const m1 = defineModule({
      name: 'first',
      description: '',
      category: 'reference',
      dependencies: [],
      run: async () => ({}) as never,
      compensate: async () => {
        order.push('first');
      },
    });
    const m2 = defineModule({
      name: 'second',
      description: '',
      category: 'reference',
      dependencies: ['first'],
      run: async () => ({}) as never,
      compensate: async () => {
        order.push('second');
      },
    });

    const results: ModuleResult[] = [
      {
        moduleName: 'first',
        status: 'COMPLETED',
        recordsCreated: 1,
        recordsSkipped: 0,
        recordsFailed: 0,
        recordsCompensated: 0,
        durationMs: 1,
        factoriesUsed: [],
        modelsTouched: [],
        bulkStrategy: 'CREATE_MANY',
        checkpointsSaved: 0,
        memoryPeakMb: 0,
        metadata: {},
      },
      {
        moduleName: 'second',
        status: 'COMPLETED',
        recordsCreated: 1,
        recordsSkipped: 0,
        recordsFailed: 0,
        recordsCompensated: 0,
        durationMs: 1,
        factoriesUsed: [],
        modelsTouched: [],
        bulkStrategy: 'CREATE_MANY',
        checkpointsSaved: 0,
        memoryPeakMb: 0,
        metadata: {},
      },
    ];

    const engine = new CompensationEngine(createLogger());
    const ctx = {} as unknown as ModuleContext;

    await engine.compensate(results, [m1, m2], ctx);
    // Reverse order — last completed undone first
    expect(order).toEqual(['second', 'first']);
  });

  it('skips modules without compensate function', async () => {
    const m = defineModule({
      name: 'no-comp',
      description: '',
      category: 'reference',
      dependencies: [],
      run: async () => ({}) as never,
    });

    const result: ModuleResult = {
      moduleName: 'no-comp',
      status: 'COMPLETED',
      recordsCreated: 1,
      recordsSkipped: 0,
      recordsFailed: 0,
      recordsCompensated: 0,
      durationMs: 1,
      factoriesUsed: [],
      modelsTouched: [],
      bulkStrategy: 'CREATE_MANY',
      checkpointsSaved: 0,
      memoryPeakMb: 0,
      metadata: {},
    };

    const engine = new CompensationEngine(createLogger());
    const stats = await engine.compensate([result], [m], {} as unknown as ModuleContext);
    expect(stats.compensated).toBe(0);
  });
});
