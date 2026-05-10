// ═══════════════════════════════════════════════════════════════
// PAYOUTS + LEADS PIPELINE
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { payoutFactory } from '../../factories/commerce/payout.factory';
import { leadFactory } from '../../factories/commerce/lead.factory';
import { leadActivityFactory } from '../../factories/commerce/lead-activity.factory';

const LEAD_COUNT = 300;

export const payoutsModule = defineModule({
  name: 'commerce.payouts',
  description: 'Datun→clinic payout records (future revenue share)',
  category: 'commerce',
  version: '2.0.0',
  dependencies: ['organization.clinics'],
  modelsTouched: ['payout'],
  factoriesUsed: ['payout'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CLINIC_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.PAYOUT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(payoutsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1900);
      const clinicIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.CLINIC_IDS);
      const payoutIds: string[] = [];

      await runInScope(payoutsModule, ctx, async () => {
        for (const clinicId of clinicIds) {
          for (let m = 0; m < 6; m++) {
            const periodStart = new Date(Date.now() - (m + 1) * 30 * 86400000);
            const p = payoutFactory.build(undefined, { clinicId, periodStart });
            payoutIds.push(p.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.PAYOUT_IDS, payoutIds);
      return {
        recordsCreated: 0,
        recordsSkipped: payoutIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['payout'],
        modelsTouched: ['payout'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const leadsModule = defineModule({
  name: 'commerce.leads',
  description: 'Sales pipeline — clinics in various stages',
  category: 'commerce',
  version: '2.0.0',
  dependencies: [],
  modelsTouched: ['lead'],
  factoriesUsed: ['lead'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  providesRegistryKeys: [REGISTRY_KEYS.LEAD_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(leadsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1950);
      const leads = leadFactory.buildList(LEAD_COUNT);

      await runInScope(leadsModule, ctx, async () => {
        /* schema may not support */
      });
      ctx.registry.set(
        REGISTRY_KEYS.LEAD_IDS,
        leads.map((l) => l.id),
      );

      return {
        recordsCreated: 0,
        recordsSkipped: leads.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['lead'],
        modelsTouched: ['lead'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const leadActivitiesModule = defineModule({
  name: 'commerce.lead-activities',
  description: 'Per-lead activity history (calls, demos, emails)',
  category: 'commerce',
  version: '2.0.0',
  dependencies: ['commerce.leads'],
  modelsTouched: ['leadActivity'],
  factoriesUsed: ['leadActivity'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.LEAD_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.LEAD_ACTIVITY_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(leadActivitiesModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1970);
      const leadIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.LEAD_IDS);
      const activityIds: string[] = [];

      await runInScope(leadActivitiesModule, ctx, async () => {
        for (const leadId of leadIds) {
          // 3-8 activities per lead
          const activityCount = 3 + (leadId.charCodeAt(leadId.length - 1) % 6);
          for (let i = 0; i < activityCount; i++) {
            const a = leadActivityFactory.build(undefined, { leadId });
            activityIds.push(a.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.LEAD_ACTIVITY_IDS, activityIds);
      return {
        recordsCreated: 0,
        recordsSkipped: activityIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['leadActivity'],
        modelsTouched: ['leadActivity'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
