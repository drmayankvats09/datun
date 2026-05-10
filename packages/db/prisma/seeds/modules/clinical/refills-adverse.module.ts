// ═══════════════════════════════════════════════════════════════
// REFILLS + ADVERSE EVENTS — pharmacovigilance trail
// CDSCO compliance reporting + DCI India tracking
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { prescriptionRefillFactory } from '../../factories/clinical/prescription-refill.factory';
import { adverseEventFactory } from '../../factories/clinical/adverse-event.factory';

export const refillsModule = defineModule({
  name: 'clinical.refills',
  description: 'Prescription refill requests (~10% of prescriptions)',
  category: 'clinical',
  version: '2.0.0',
  dependencies: ['clinical.prescriptions'],
  modelsTouched: ['prescriptionRefill'],
  factoriesUsed: ['prescriptionRefill'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.PRESCRIPTION_IDS, REGISTRY_KEYS.PATIENT_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.REFILL_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(refillsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 800);
      const rxIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PRESCRIPTION_IDS);
      const patientIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PATIENT_IDS);

      const refillIds: string[] = [];
      await runInScope(refillsModule, ctx, async () => {
        for (let i = 0; i < rxIds.length; i++) {
          if (i % 10 !== 0) continue;
          const refill = prescriptionRefillFactory.build(undefined, {
            originalPrescriptionId: rxIds[i]!,
            patientId: patientIds[i % patientIds.length]!,
          });
          refillIds.push(refill.id);
        }
      });

      ctx.registry.set(REGISTRY_KEYS.REFILL_IDS, refillIds);
      ctx.logger.info(`✓ Refills built`, { count: refillIds.length });

      return {
        recordsCreated: 0,
        recordsSkipped: refillIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['prescriptionRefill'],
        modelsTouched: ['prescriptionRefill'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const adverseEventsModule = defineModule({
  name: 'clinical.adverse-events',
  description: 'Adverse event reports (rare, ~0.5% of prescriptions)',
  category: 'clinical',
  version: '2.0.0',
  dependencies: ['clinical.prescriptions'],
  modelsTouched: ['adverseEvent'],
  factoriesUsed: ['adverseEvent'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.PRESCRIPTION_IDS, REGISTRY_KEYS.PATIENT_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.ADVERSE_EVENT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(adverseEventsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 820);
      const rxIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PRESCRIPTION_IDS);
      const patientIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PATIENT_IDS);

      const aeIds: string[] = [];
      await runInScope(adverseEventsModule, ctx, async () => {
        for (let i = 0; i < rxIds.length; i++) {
          if (i % 200 !== 0) continue;
          const ae = adverseEventFactory.build(undefined, {
            prescriptionId: rxIds[i]!,
            patientId: patientIds[i % patientIds.length]!,
          });
          aeIds.push(ae.id);
        }
      });

      ctx.registry.set(REGISTRY_KEYS.ADVERSE_EVENT_IDS, aeIds);
      return {
        recordsCreated: 0,
        recordsSkipped: aeIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['adverseEvent'],
        modelsTouched: ['adverseEvent'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
