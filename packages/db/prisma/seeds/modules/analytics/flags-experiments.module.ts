// ═══════════════════════════════════════════════════════════════
// COHORTS + FEATURE FLAGS + EXPERIMENTS
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { cohortTableFactory } from '../../factories/analytics/cohort-table.factory';
import { featureFlagFactory } from '../../factories/analytics/feature-flag.factory';
import { experimentAssignmentFactory } from '../../factories/analytics/experiment-assignment.factory';

const FLAG_COUNT = 30;
const EXPERIMENT_COUNT = 5;

export const cohortTablesModule = defineModule({
  name: 'analytics.cohort-tables',
  description: '24-month retention cohorts',
  category: 'analytics',
  version: '2.0.0',
  dependencies: [],
  modelsTouched: ['cohortTable'],
  factoriesUsed: ['cohortTable'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  providesRegistryKeys: [REGISTRY_KEYS.COHORT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(cohortTablesModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2700);
      const cohortIds: string[] = [];
      const today = new Date();

      await runInScope(cohortTablesModule, ctx, async () => {
        for (let m = 0; m < 24; m++) {
          const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
          const cohort = cohortTableFactory.build(undefined, {
            cohortMonth: monthDate.toISOString().slice(0, 7),
          });
          cohortIds.push(cohort.id);
        }
      });

      ctx.registry.set(REGISTRY_KEYS.COHORT_IDS, cohortIds);
      return {
        recordsCreated: 0,
        recordsSkipped: cohortIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['cohortTable'],
        modelsTouched: ['cohortTable'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const featureFlagsModule = defineModule({
  name: 'analytics.feature-flags',
  description: 'LaunchDarkly-style feature flags',
  category: 'analytics',
  version: '2.0.0',
  dependencies: [],
  modelsTouched: ['featureFlag'],
  factoriesUsed: ['featureFlag'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  providesRegistryKeys: [REGISTRY_KEYS.FLAG_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(featureFlagsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2750);
      const flags = featureFlagFactory.buildList(FLAG_COUNT);

      await runInScope(featureFlagsModule, ctx, async () => {
        /* schema may not support */
      });
      ctx.registry.set(
        REGISTRY_KEYS.FLAG_IDS,
        flags.map((f) => f.id),
      );

      return {
        recordsCreated: 0,
        recordsSkipped: flags.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['featureFlag'],
        modelsTouched: ['featureFlag'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const experimentAssignmentsModule = defineModule({
  name: 'analytics.experiment-assignments',
  description: 'Per-user A/B test variant assignments',
  category: 'analytics',
  version: '2.0.0',
  dependencies: ['identity.patient-users'],
  modelsTouched: ['experimentAssignment'],
  factoriesUsed: ['experimentAssignment'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.PATIENT_USER_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.EXPERIMENT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(experimentAssignmentsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2800);
      const userIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PATIENT_USER_IDS);
      const experimentKeys = [
        'pricing-test-v3',
        'onboarding-flow-v2',
        'voice-input-pilot',
        'multilingual-tamil',
        'photo-analysis-v2',
      ];
      const assignmentIds: string[] = [];

      await runInScope(experimentAssignmentsModule, ctx, async () => {
        for (const userId of userIds) {
          for (const expKey of experimentKeys.slice(0, EXPERIMENT_COUNT)) {
            const a = experimentAssignmentFactory.build(undefined, {
              experimentKey: expKey,
              userId,
            });
            assignmentIds.push(a.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.EXPERIMENT_IDS, assignmentIds);
      return {
        recordsCreated: 0,
        recordsSkipped: assignmentIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['experimentAssignment'],
        modelsTouched: ['experimentAssignment'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
