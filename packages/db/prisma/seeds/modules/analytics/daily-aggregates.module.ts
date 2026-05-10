// ═══════════════════════════════════════════════════════════════
// DAILY AGGREGATES — pre-computed metrics for dashboard speed
// 365 days × N clinics = bulk insert candidate
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { dailyAggregateFactory } from '../../factories/analytics/daily-aggregate.factory';

const DAYS_BACK = 365;

export const dailyAggregatesModule = defineModule({
  name: 'analytics.daily-aggregates',
  description: '365-day per-clinic aggregates (Pareto + festival surge)',
  category: 'analytics',
  version: '2.0.0',
  dependencies: ['organization.clinics'],
  modelsTouched: ['dailyAggregate'],
  factoriesUsed: ['dailyAggregate'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CLINIC_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.DAILY_AGGREGATE_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(dailyAggregatesModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2600);
      const clinicIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.CLINIC_IDS);
      const aggIds: string[] = [];
      const today = new Date();

      await runInScope(dailyAggregatesModule, ctx, async () => {
        for (let dayOffset = 0; dayOffset < DAYS_BACK; dayOffset++) {
          const day = new Date(today.getTime() - dayOffset * 86400000);
          const dateStr = day.toISOString().slice(0, 10);
          // Global aggregate
          aggIds.push(dailyAggregateFactory.build(undefined, { date: dateStr }).id);
          // Per-clinic aggregate
          for (const clinicId of clinicIds) {
            aggIds.push(dailyAggregateFactory.build(undefined, { date: dateStr, clinicId }).id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.DAILY_AGGREGATE_IDS, aggIds);
      ctx.logger.info(`✓ Daily aggregates built`, { count: aggIds.length });

      return {
        recordsCreated: 0,
        recordsSkipped: aggIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['dailyAggregate'],
        modelsTouched: ['dailyAggregate'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports', daysBack: DAYS_BACK },
      };
    }),
});
