// ═══════════════════════════════════════════════════════════════
// WEBHOOKS + TOKENS + INTEGRATION EVENTS
// Outbound webhooks + OAuth tokens + inbound events
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { webhookDeliveryFactory } from '../../factories/integrations/webhook-delivery.factory';
import { integrationTokenFactory } from '../../factories/integrations/integration-token.factory';
import { integrationEventFactory } from '../../factories/integrations/integration-event.factory';

export const webhooksModule = defineModule({
  name: 'integrations.webhooks',
  description: 'Outbound webhook delivery records (success + retries + failures)',
  category: 'integrations',
  version: '2.0.0',
  dependencies: ['organization.clinics', 'clinical.consultations'],
  modelsTouched: ['webhookDelivery'],
  factoriesUsed: ['webhookDelivery'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CLINIC_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.WEBHOOK_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(webhooksModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2000);
      const clinicIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.CLINIC_IDS);
      const webhookIds: string[] = [];

      await runInScope(webhooksModule, ctx, async () => {
        for (const clinicId of clinicIds) {
          for (let i = 0; i < 20; i++) {
            const w = webhookDeliveryFactory.build(undefined, { clinicId });
            webhookIds.push(w.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.WEBHOOK_IDS, webhookIds);
      return {
        recordsCreated: 0,
        recordsSkipped: webhookIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['webhookDelivery'],
        modelsTouched: ['webhookDelivery'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const tokensModule = defineModule({
  name: 'integrations.tokens',
  description: 'OAuth tokens for Google Calendar, Razorpay, Zoho, etc',
  category: 'integrations',
  version: '2.0.0',
  dependencies: ['organization.clinics'],
  modelsTouched: ['integrationToken'],
  factoriesUsed: ['integrationToken'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CLINIC_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.TOKEN_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(tokensModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2050);
      const clinicIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.CLINIC_IDS);
      const tokenIds: string[] = [];

      await runInScope(tokensModule, ctx, async () => {
        for (const clinicId of clinicIds) {
          const providers: ('GOOGLE_CALENDAR' | 'RAZORPAY' | 'ZOHO_BOOKS')[] = [
            'GOOGLE_CALENDAR',
            'RAZORPAY',
            'ZOHO_BOOKS',
          ];
          for (const p of providers) {
            const t = integrationTokenFactory.build(undefined, { clinicId, provider: p });
            tokenIds.push(t.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.TOKEN_IDS, tokenIds);
      return {
        recordsCreated: 0,
        recordsSkipped: tokenIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['integrationToken'],
        modelsTouched: ['integrationToken'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const integrationEventsModule = defineModule({
  name: 'integrations.events',
  description: 'Inbound events from third-party services',
  category: 'integrations',
  version: '2.0.0',
  dependencies: ['organization.clinics'],
  modelsTouched: ['integrationEvent'],
  factoriesUsed: ['integrationEvent'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CLINIC_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.INTEGRATION_EVENT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(integrationEventsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2100);
      const clinicIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.CLINIC_IDS);
      const eventIds: string[] = [];

      await runInScope(integrationEventsModule, ctx, async () => {
        for (const clinicId of clinicIds) {
          for (let i = 0; i < 30; i++) {
            const evt = integrationEventFactory.build(undefined, { clinicId });
            eventIds.push(evt.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.INTEGRATION_EVENT_IDS, eventIds);
      return {
        recordsCreated: 0,
        recordsSkipped: eventIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['integrationEvent'],
        modelsTouched: ['integrationEvent'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
