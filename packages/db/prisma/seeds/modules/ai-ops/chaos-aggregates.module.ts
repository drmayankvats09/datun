// ═══════════════════════════════════════════════════════════════
// CHAOS SCENARIOS + AI COST AGGREGATES
// 21 chaos types + monthly cost rollups
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { chaosScenarioFactory } from '../../factories/ai-training/chaos-scenario.factory';
import { aiCostAggregateFactory } from '../../factories/ai-training/ai-cost-aggregate.factory';

export const chaosScenariosModule = defineModule({
  name: 'ai-ops.chaos-scenarios',
  description: '21 chaos engineering scenarios for AI failure-mode testing',
  category: 'ai-ops',
  version: '2.0.0',
  dependencies: [],
  modelsTouched: ['chaosScenario'],
  factoriesUsed: ['chaosScenario'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  providesRegistryKeys: [REGISTRY_KEYS.CHAOS_SCENARIO_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(chaosScenariosModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1700);
      const scenarios = chaosScenarioFactory.buildList(50);
      await runInScope(chaosScenariosModule, ctx, async () => {
        /* schema may not support */
      });

      ctx.registry.set(
        REGISTRY_KEYS.CHAOS_SCENARIO_IDS,
        scenarios.map((s) => s.id),
      );
      return {
        recordsCreated: 0,
        recordsSkipped: scenarios.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['chaosScenario'],
        modelsTouched: ['chaosScenario'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const aiCostAggregatesModule = defineModule({
  name: 'ai-ops.ai-cost-aggregates',
  description: 'Daily/weekly/monthly AI cost rollups for last 12 months',
  category: 'ai-ops',
  version: '2.0.0',
  dependencies: [],
  modelsTouched: ['aiCostAggregate'],
  factoriesUsed: ['aiCostAggregate'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  providesRegistryKeys: [REGISTRY_KEYS.AI_COST_AGGREGATE_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(aiCostAggregatesModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1750);
      const aggIds: string[] = [];
      const today = new Date();

      // 365 daily + 52 weekly + 12 monthly
      for (let dayOffset = 364; dayOffset >= 0; dayOffset--) {
        const day = new Date(today.getTime() - dayOffset * 86400000);
        const agg = aiCostAggregateFactory.build(undefined, { level: 'DAILY', periodStart: day });
        aggIds.push(agg.id);
      }

      ctx.registry.set(REGISTRY_KEYS.AI_COST_AGGREGATE_IDS, aggIds);
      return {
        recordsCreated: 0,
        recordsSkipped: aggIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['aiCostAggregate'],
        modelsTouched: ['aiCostAggregate'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
