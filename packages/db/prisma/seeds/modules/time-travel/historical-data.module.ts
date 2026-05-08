// ═══════════════════════════════════════════════════════════════
// HISTORICAL DATA — Pareto + festival surge multi-year backfill
// Generates retroactive records to make analytics demos rich
// Source: Pareto α≈1.16 (Newman 2005) + Diwali/Eid surge factor
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { generateHistoricalAnalytics } from '../../factories/relationships/time-travel.composer';

export const historicalDataModule = defineModule({
  name: 'time-travel.historical-data',
  description: 'Pareto-distributed retroactive analytics for last 24 months',
  category: 'time-travel',
  version: '2.0.0',
  dependencies: ['organization.clinics'],
  modelsTouched: ['dailyAggregate', 'cohortTable'],
  factoriesUsed: [],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  useTransaction: false, // composer manages its own
  consumesRegistryKeys: [REGISTRY_KEYS.CLINIC_IDS],
  allowedEnvironments: ['development', 'test', 'staging'],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(historicalDataModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 3000);
      const clinicIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.CLINIC_IDS);

      let aggregatesCreated = 0;
      let cohortsCreated = 0;

      await runInScope(historicalDataModule, ctx, async (tx) => {
        const result = await generateHistoricalAnalytics(tx, {
          daysBack: 730,
          clinicIds,
          generateCohorts: true,
        });
        aggregatesCreated = result.aggregatesCreated;
        cohortsCreated = result.cohortsCreated;
      });

      ctx.logger.info(`✓ Historical data backfilled`, {
        aggregates: aggregatesCreated,
        cohorts: cohortsCreated,
      });

      return {
        recordsCreated: aggregatesCreated + cohortsCreated,
        recordsSkipped: 0,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: [],
        modelsTouched: ['dailyAggregate', 'cohortTable'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { aggregatesCreated, cohortsCreated, daysBack: 730 },
      };
    }),
});
