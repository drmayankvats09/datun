// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTIONS + INVOICES — clinic billing trail
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { subscriptionEventFactory } from '../../factories/commerce/subscription-event.factory';
import { clinicInvoiceFactory } from '../../factories/commerce/clinic-invoice.factory';

export const subscriptionEventsModule = defineModule({
  name: 'commerce.subscription-events',
  description: 'Per-clinic subscription event timeline',
  category: 'commerce',
  version: '2.0.0',
  dependencies: ['organization.clinics'],
  modelsTouched: ['subscriptionEvent'],
  factoriesUsed: ['subscriptionEvent'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CLINIC_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.SUBSCRIPTION_EVENT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(subscriptionEventsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1800);
      const clinicIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.CLINIC_IDS);
      const eventIds: string[] = [];

      await runInScope(subscriptionEventsModule, ctx, async () => {
        for (const clinicId of clinicIds) {
          // 12-month event history per clinic
          for (let m = 0; m < 12; m++) {
            const evt = subscriptionEventFactory.build(undefined, {
              clinicId,
              subscriptionId: `sub-${clinicId}`,
            });
            eventIds.push(evt.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.SUBSCRIPTION_EVENT_IDS, eventIds);
      return {
        recordsCreated: 0,
        recordsSkipped: eventIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['subscriptionEvent'],
        modelsTouched: ['subscriptionEvent'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const clinicInvoicesModule = defineModule({
  name: 'commerce.clinic-invoices',
  description: '12-month invoice history per clinic with GST breakdown',
  category: 'commerce',
  version: '2.0.0',
  dependencies: ['organization.clinics'],
  modelsTouched: ['clinicInvoice'],
  factoriesUsed: ['clinicInvoice'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CLINIC_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.INVOICE_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(clinicInvoicesModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1850);
      const clinicIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.CLINIC_IDS);
      const invoiceIds: string[] = [];

      await runInScope(clinicInvoicesModule, ctx, async () => {
        for (const clinicId of clinicIds) {
          for (let m = 0; m < 12; m++) {
            const periodStart = new Date(Date.now() - (m + 1) * 30 * 86400000);
            const inv = clinicInvoiceFactory.build(undefined, {
              clinicId,
              subscriptionId: `sub-${clinicId}`,
              amountInr: 1999,
              billingPeriodStart: periodStart,
            });
            invoiceIds.push(inv.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.INVOICE_IDS, invoiceIds);
      return {
        recordsCreated: 0,
        recordsSkipped: invoiceIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['clinicInvoice'],
        modelsTouched: ['clinicInvoice'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
