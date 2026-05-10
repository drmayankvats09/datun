// ═══════════════════════════════════════════════════════════════
// DPDP REQUESTS + SECURITY EVENTS
// India DPDP Act 2023 + SOC 2 Type II compliance
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { dpdpDataRequestFactory } from '../../factories/compliance/dpdp-data-request.factory';
import { securityEventFactory } from '../../factories/compliance/security-event.factory';

export const dpdpRequestsModule = defineModule({
  name: 'compliance.dpdp-requests',
  description: 'DPDP Act data requests (export, deletion, correction)',
  category: 'compliance',
  version: '2.0.0',
  dependencies: ['people.patients'],
  modelsTouched: ['dpdpDataRequest'],
  factoriesUsed: ['dpdpDataRequest'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  piiSensitive: true,
  consumesRegistryKeys: [REGISTRY_KEYS.PATIENT_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.DPDP_REQUEST_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(dpdpRequestsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1500);
      const patientIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PATIENT_IDS);
      // ~3% of patients raise DPDP requests
      const reqCount = Math.floor(patientIds.length * 0.03);
      const reqIds: string[] = [];

      await runInScope(dpdpRequestsModule, ctx, async () => {
        for (let i = 0; i < reqCount; i++) {
          const r = dpdpDataRequestFactory.build(undefined, { patientId: patientIds[i]! });
          reqIds.push(r.id);
        }
      });

      ctx.registry.set(REGISTRY_KEYS.DPDP_REQUEST_IDS, reqIds);
      return {
        recordsCreated: 0,
        recordsSkipped: reqIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['dpdpDataRequest'],
        modelsTouched: ['dpdpDataRequest'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const securityEventsModule = defineModule({
  name: 'compliance.security-events',
  description: 'Security events (failed logins, suspicious access, brute-force)',
  category: 'compliance',
  version: '2.0.0',
  dependencies: ['identity.patient-users'],
  modelsTouched: ['securityEvent'],
  factoriesUsed: ['securityEvent'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.PATIENT_USER_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.SECURITY_EVENT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(securityEventsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1550);
      const userIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PATIENT_USER_IDS);
      const eventCount = userIds.length * 2; // ~2 events per user on average
      const eventIds: string[] = [];

      await runInScope(securityEventsModule, ctx, async () => {
        for (let i = 0; i < eventCount; i++) {
          const evt = securityEventFactory.build(undefined, {
            userId: userIds[i % userIds.length]!,
          });
          eventIds.push(evt.id);
        }
      });

      ctx.registry.set(REGISTRY_KEYS.SECURITY_EVENT_IDS, eventIds);
      return {
        recordsCreated: 0,
        recordsSkipped: eventIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['securityEvent'],
        modelsTouched: ['securityEvent'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
