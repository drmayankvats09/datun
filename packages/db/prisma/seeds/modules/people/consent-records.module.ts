import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS, getOrFetch } from '../core/module-registry.js';
import { resetSequences } from '../../factories/core/sequence';
import { consentRecordFactory } from '../../factories/patient/consent-record.factory';

export const consentRecordsModule = defineModule({
  name: 'people.consent-records',
  description: 'DPDP Act consent per patient × purpose × data category',
  category: 'people',
  version: '2.0.0',
  dependencies: ['people.patients'],
  modelsTouched: ['consentRecord'],
  factoriesUsed: ['consentRecord'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  piiSensitive: true,
  consumesRegistryKeys: [REGISTRY_KEYS.PATIENT_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.CONSENT_RECORD_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(consentRecordsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 360);
      const patientIds = await getOrFetch(ctx, REGISTRY_KEYS.PATIENT_IDS, async () =>
        (await ctx.prisma.patient.findMany({ select: { id: true } })).map((p) => p.id),
      );
      const consentIds: string[] = [];

      await runInScope(consentRecordsModule, ctx, async () => {
        // Each patient: 3 consent records (TRIAGE + TREATMENT + AI_TRAINING)
        for (const patientId of patientIds) {
          for (const purpose of ['TRIAGE', 'TREATMENT', 'AI_TRAINING'] as const) {
            const consent = consentRecordFactory.build(undefined, { patientId, purpose });
            consentIds.push(consent.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.CONSENT_RECORD_IDS, consentIds);
      ctx.logger.info(`✓ Consent records built`, { count: consentIds.length });

      return {
        recordsCreated: 0,
        recordsSkipped: consentIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['consentRecord'],
        modelsTouched: ['consentRecord'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
