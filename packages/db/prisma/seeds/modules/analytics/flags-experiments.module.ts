// ═══════════════════════════════════════════════════════════════
// COHORTS + FEATURE FLAGS + EXPERIMENTS — Task #49 update
// ─────────────────────────────────────────────────────────────────
// Phase 7 left `featureFlagsModule.run` as a no-op with the comment
// "/* schema may not support */". The Task #49 schema fully
// supports persistence; this module now writes the baseline 30
// flags (one per FLAG_KEYS registry entry) by calling the
// factory's real `persist` (upsert on flagKey).
//
// Idempotency: the factory's upsert is keyed on `flagKey`, so
// re-running the seed only refreshes `name`, `description`, and
// `updatedAt`. Hand-tweaked rows survive.
//
// The cohort + experiment-assignment modules in this file are
// unchanged — only `featureFlagsModule` materially changes.
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { cohortTableFactory } from '../../factories/analytics/cohort-table.factory';
import { featureFlagFactory, FLAG_TEMPLATES } from '../../factories/analytics/feature-flag.factory';
import { experimentAssignmentFactory } from '../../factories/analytics/experiment-assignment.factory';

const EXPERIMENT_COUNT = 5;

// ─── Cohorts (unchanged) ────────────────────────────────────────

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

// ─── Feature flags (Task #49 — now persists for real) ───────────

export const featureFlagsModule = defineModule({
  name: 'analytics.feature-flags',
  description:
    'Task #49 baseline: one row per FLAG_KEYS registry entry, idempotent upsert keyed on flagKey',
  category: 'analytics',
  version: '3.0.0',
  dependencies: [],
  modelsTouched: ['featureFlag'],
  factoriesUsed: ['featureFlag'],
  bulkStrategy: 'CREATE_MANY',
  // We deliberately re-run each invocation — upsert is the
  // idempotency mechanism, not module-level skip. This lets seed
  // refreshes pick up new registry keys without manual reset.
  idempotencyStrategy: { kind: 'NEVER' },
  providesRegistryKeys: [REGISTRY_KEYS.FLAG_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(featureFlagsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2750);

      const flagIds: string[] = [];
      let created = 0;
      let failed = 0;

      await runInScope(featureFlagsModule, ctx, async () => {
        // Seed one row per registry template — exact coverage of the
        // canonical FLAG_KEYS set. This guarantees every key the
        // evaluator accepts has a backing row by the time the API
        // starts serving traffic in a fresh environment.
        for (const template of FLAG_TEMPLATES) {
          try {
            const flag = await featureFlagFactory.create(ctx.prisma, undefined, {
              flagKey: template.key,
            });
            flagIds.push(flag.id);
            created++;
          } catch (err) {
            // A factory failure for one flag must not poison the
            // entire seed — log and continue. The dev workflow
            // (re-run seed) will catch up on the missing row.
            failed++;
            ctx.logger?.warn?.('[featureFlagsModule] persist failed', {
              flagKey: template.key,
              error: (err as Error).message,
            });
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.FLAG_IDS, flagIds);

      return {
        recordsCreated: created,
        recordsSkipped: 0,
        recordsFailed: failed,
        recordsCompensated: 0,
        factoriesUsed: ['featureFlag'],
        modelsTouched: ['featureFlag'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: {
          note: `Task #49: persisted ${created}/${FLAG_TEMPLATES.length} baseline flags`,
        },
      };
    }),
});

// ─── Experiment assignments (unchanged) ─────────────────────────

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
