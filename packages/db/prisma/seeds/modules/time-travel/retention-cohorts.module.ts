// ═══════════════════════════════════════════════════════════════
// RETENTION COHORTS — synthetic patient retention curves
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { cohortTableFactory } from '../../factories/analytics/cohort-table.factory';

export const retentionCohortsModule = defineModule({
  name: 'time-travel.retention-cohorts',
  description: 'Patient registration cohorts with retention curves',
  category: 'time-travel',
  version: '2.0.0',
  dependencies: ['people.patients'],
  modelsTouched: ['cohortTable'],
  factoriesUsed: ['cohortTable'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.PATIENT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(retentionCohortsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 3050);
      const cohortIds: string[] = [];
      const today = new Date();

      await runInScope(retentionCohortsModule, ctx, async () => {
        for (let m = 0; m < 36; m++) {
          const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
          const cohort = cohortTableFactory.build(undefined, {
            cohortMonth: monthDate.toISOString().slice(0, 7),
            cohortType: 'PATIENT_REGISTRATION',
          });
          cohortIds.push(cohort.id);
        }
      });

      return {
        recordsCreated: 0,
        recordsSkipped: cohortIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['cohortTable'],
        modelsTouched: ['cohortTable'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports', monthsBack: 36 },
      };
    }),
});
