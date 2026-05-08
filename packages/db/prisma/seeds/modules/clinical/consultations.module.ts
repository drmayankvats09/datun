import type { Consultation, Patient } from '@prisma/client';
import { defineModule, environmentGuard, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { consultationFactory } from '../../factories/clinical/consultation.factory';
import { bulkInsert } from '../../factories/core/bulk-insert';

const CONSULTATION_COUNT = 2000;
const BATCH_SIZE = 500;

export const consultationsModule = defineModule({
  name: 'clinical.consultations',
  description: `${CONSULTATION_COUNT} consultations across patients`,
  category: 'clinical',
  version: '2.0.0',
  dependencies: ['people.patients', 'organization.doctors'],
  modelsTouched: ['consultation'],
  factoriesUsed: ['consultation'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: {
    kind: 'COUNT_THRESHOLD',
    modelName: 'consultation',
    threshold: CONSULTATION_COUNT,
  },
  useTransaction: true,
  transactionTimeoutMs: 240_000,
  allowedEnvironments: ['development', 'test', 'staging'],
  piiSensitive: true,
  checkpointEveryNBatches: 4,
  consumesRegistryKeys: [
    REGISTRY_KEYS.PATIENT_RECORDS,
    REGISTRY_KEYS.DOCTOR_IDS,
    REGISTRY_KEYS.PATIENT_TO_CLINIC,
  ],
  providesRegistryKeys: [
    REGISTRY_KEYS.CONSULTATION_IDS,
    REGISTRY_KEYS.CONSULTATION_RECORDS,
    REGISTRY_KEYS.CONSULTATION_TO_PATIENT,
  ],

  checkIdempotency: async (ctx) => (await ctx.prisma.consultation.count()) >= CONSULTATION_COUNT,

  run: async (ctx) =>
    measureExecution(consultationsModule, ctx, async () => {
      environmentGuard(consultationsModule, ctx);
      resetSequences(ctx.masterSeed + 400);

      const patientRecords = ctx.registry.getRequired<Patient[]>(REGISTRY_KEYS.PATIENT_RECORDS);
      const doctorIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.DOCTOR_IDS);
      const patientToClinic = ctx.registry.getRequired<Record<string, string>>(
        REGISTRY_KEYS.PATIENT_TO_CLINIC,
      );

      const consultationToPatient: Record<string, string> = {};
      const consultationRecords: Consultation[] = [];
      let created = 0;
      let checkpointsSaved = 0;

      await runInScope(consultationsModule, ctx, async (tx) => {
        for (let batchStart = 0; batchStart < CONSULTATION_COUNT; batchStart += BATCH_SIZE) {
          if (ctx.abortSignal.aborted) throw new Error('Aborted');
          const batchEnd = Math.min(batchStart + BATCH_SIZE, CONSULTATION_COUNT);
          const batch: Consultation[] = [];

          for (let i = batchStart; i < batchEnd; i++) {
            const patient = patientRecords[i % patientRecords.length]!;
            const clinicId = patientToClinic[patient.id] ?? undefined;
            const doctorId = i % 4 === 0 ? doctorIds[i % doctorIds.length]! : undefined;
            const consultation = consultationFactory.build(undefined, {
              patientId: patient.id,
              doctorId,
              clinicId,
              patientArchetypeIcd10: patient.primaryConditionIcd10 ?? undefined,
              locale: patient.preferredLocale as
                | 'hindi'
                | 'english'
                | 'punjabi'
                | 'bengali'
                | 'tamil'
                | 'telugu'
                | 'marathi'
                | 'gujarati',
            });
            batch.push(consultation);
            consultationToPatient[consultation.id] = patient.id;
            consultationRecords.push(consultation);
          }

          const r = await bulkInsert(tx, 'consultation', batch, {
            batchSize: BATCH_SIZE,
            skipDuplicates: true,
          });
          created += r.totalInserted;

          if (
            Math.floor(batchStart / BATCH_SIZE) % consultationsModule.checkpointEveryNBatches ===
            0
          ) {
            await ctx.saveCheckpoint(Math.floor(batchStart / BATCH_SIZE), created);
            checkpointsSaved++;
          }
        }
      });

      ctx.registry.set(
        REGISTRY_KEYS.CONSULTATION_IDS,
        consultationRecords.map((c) => c.id),
      );
      ctx.registry.set(REGISTRY_KEYS.CONSULTATION_RECORDS, consultationRecords);
      ctx.registry.set(REGISTRY_KEYS.CONSULTATION_TO_PATIENT, consultationToPatient);
      ctx.logger.info(`✓ Consultations seeded`, { created, checkpointsSaved });

      return {
        recordsCreated: created,
        recordsSkipped: CONSULTATION_COUNT - created,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['consultation'],
        modelsTouched: ['consultation'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved,
        metadata: { batchSize: BATCH_SIZE },
      };
    }),

  compensate: async (ctx) => {
    const ids = ctx.registry.get<string[]>(REGISTRY_KEYS.CONSULTATION_IDS);
    if (ids) await ctx.prisma.consultation.deleteMany({ where: { id: { in: ids } } });
  },
});
