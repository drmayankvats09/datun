// ═══════════════════════════════════════════════════════════════
// CAMPAIGNS + UTM ATTRIBUTIONS + REFERRAL EVENTS
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { campaignFactory } from '../../factories/marketing/campaign.factory';
import { utmAttributionFactory } from '../../factories/marketing/utm-attribution.factory';
import { referralEventFactory } from '../../factories/marketing/referral-event.factory';

const CAMPAIGN_COUNT = 80;

export const campaignsModule = defineModule({
  name: 'marketing.campaigns',
  description: 'Multi-channel marketing campaigns (WhatsApp, IG, Google Ads, etc)',
  category: 'marketing',
  version: '2.0.0',
  dependencies: [],
  modelsTouched: ['campaign'],
  factoriesUsed: ['campaign'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  providesRegistryKeys: [REGISTRY_KEYS.CAMPAIGN_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(campaignsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2400);
      const campaigns = campaignFactory.buildList(CAMPAIGN_COUNT);

      await runInScope(campaignsModule, ctx, async () => {
        /* schema may not support */
      });
      ctx.registry.set(
        REGISTRY_KEYS.CAMPAIGN_IDS,
        campaigns.map((c) => c.id),
      );

      return {
        recordsCreated: 0,
        recordsSkipped: campaigns.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['campaign'],
        modelsTouched: ['campaign'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const utmAttributionsModule = defineModule({
  name: 'marketing.utm-attributions',
  description: 'Per-touchpoint UTM attribution records (Pareto distributed)',
  category: 'marketing',
  version: '2.0.0',
  dependencies: ['marketing.campaigns', 'identity.patient-users'],
  modelsTouched: ['utmAttribution'],
  factoriesUsed: ['utmAttribution'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CAMPAIGN_IDS, REGISTRY_KEYS.PATIENT_USER_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.UTM_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(utmAttributionsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2450);
      const campaignIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.CAMPAIGN_IDS);
      const userIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PATIENT_USER_IDS);

      const utms: ReturnType<typeof utmAttributionFactory.build>[] = [];
      for (const userId of userIds) {
        // 1-5 touchpoints per user
        const touchpoints = 1 + (userId.charCodeAt(userId.length - 1) % 5);
        for (let i = 0; i < touchpoints; i++) {
          utms.push(
            utmAttributionFactory.build(undefined, {
              userId,
              campaignId: campaignIds[i % campaignIds.length]!,
            }),
          );
        }
      }

      await runInScope(utmAttributionsModule, ctx, async () => {
        /* schema may not support */
      });
      ctx.registry.set(
        REGISTRY_KEYS.UTM_IDS,
        utms.map((u) => u.id),
      );

      return {
        recordsCreated: 0,
        recordsSkipped: utms.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['utmAttribution'],
        modelsTouched: ['utmAttribution'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const referralEventsModule = defineModule({
  name: 'marketing.referral-events',
  description: 'Granular referral funnel events',
  category: 'marketing',
  version: '2.0.0',
  dependencies: ['people.patients'],
  modelsTouched: ['referralEvent'],
  factoriesUsed: ['referralEvent'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.PATIENT_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.REFERRAL_EVENT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(referralEventsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2500);
      const patientIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PATIENT_IDS);
      // ~10% of patients participate in referral
      const eventIds: string[] = [];

      await runInScope(referralEventsModule, ctx, async () => {
        for (let i = 0; i < patientIds.length; i++) {
          if (i % 10 !== 0) continue;
          const referralId = `ref-${patientIds[i]}`;
          // Funnel events
          for (const eventType of [
            'CODE_GENERATED',
            'CODE_SHARED',
            'SIGNUP_COMPLETED',
            'CONSULTATION_COMPLETED',
            'REWARD_CREDITED',
          ] as const) {
            const e = referralEventFactory.build(undefined, { referralId, eventType });
            eventIds.push(e.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.REFERRAL_EVENT_IDS, eventIds);
      return {
        recordsCreated: 0,
        recordsSkipped: eventIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['referralEvent'],
        modelsTouched: ['referralEvent'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
