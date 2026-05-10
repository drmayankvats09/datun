import type { Patient } from '@prisma/client';
import { defineModule, environmentGuard, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS, getOrFetch } from '../core/module-registry.js';
import { SEED_ERROR_CODES, seedError } from '../../factories/core';
import { resetSequences } from '../../factories/core/sequence';
import { patientFactory } from '../../factories/patient/patient.factory';
import { PATIENT_ARCHETYPES } from '../../data/medical/archetypes';
import { bulkInsert } from '../../factories/core/bulk-insert';

const PATIENT_COUNT = 1000;
const BATCH_SIZE = 200;

export const patientsModule = defineModule({
  name: 'people.patients',
  description: `${PATIENT_COUNT} realistic patients (50-archetype distributed)`,
  category: 'people',
  version: '2.0.0',
  dependencies: ['identity.patient-users', 'organization.clinics', 'reference.archetypes-catalog'],
  modelsTouched: ['patient'],
  factoriesUsed: ['patient'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'COUNT_THRESHOLD', modelName: 'patient', threshold: PATIENT_COUNT },
  useTransaction: true,
  transactionTimeoutMs: 180_000,
  allowedEnvironments: ['development', 'test', 'staging'],
  tenantScoped: false,
  piiSensitive: true,
  checkpointEveryNBatches: 5,
  consumesRegistryKeys: [REGISTRY_KEYS.PATIENT_USER_IDS, REGISTRY_KEYS.CLINIC_IDS],
  providesRegistryKeys: [
    REGISTRY_KEYS.PATIENT_IDS,
    REGISTRY_KEYS.PATIENT_RECORDS,
    REGISTRY_KEYS.PATIENT_TO_CLINIC,
  ],

  checkIdempotency: async (ctx) => (await ctx.prisma.patient.count()) >= PATIENT_COUNT,

  run: async (ctx) =>
    measureExecution(patientsModule, ctx, async () => {
      environmentGuard(patientsModule, ctx);
      resetSequences(ctx.masterSeed + 300);
      const userIds = await getOrFetch(ctx, REGISTRY_KEYS.PATIENT_USER_IDS, async () =>
        (
          await ctx.prisma.user.findMany({
            where: { primaryRole: 'PATIENT' },
            select: { id: true },
          })
        ).map((u) => u.id),
      );
      const clinicIds = await getOrFetch(ctx, REGISTRY_KEYS.CLINIC_IDS, async () =>
        (await ctx.prisma.clinic.findMany({ select: { id: true } })).map((c) => c.id),
      );
      if (userIds.length < PATIENT_COUNT) {
        throw seedError(
          SEED_ERROR_CODES.MODULE_INSUFFICIENT_DEPENDENCIES,
          `Need ${PATIENT_COUNT} users`,
          { module: 'people/patients' },
        );
      }

      const patientToClinic: Record<string, string> = {};
      const patientRecords: Patient[] = [];
      let created = 0;
      let checkpointsSaved = 0;

      await runInScope(patientsModule, ctx, async (tx) => {
        // Generate in batches with checkpoint
        for (let batchStart = 0; batchStart < PATIENT_COUNT; batchStart += BATCH_SIZE) {
          if (ctx.abortSignal.aborted) throw new Error('Aborted');

          const batchEnd = Math.min(batchStart + BATCH_SIZE, PATIENT_COUNT);
          const batchPatients: Patient[] = [];

          for (let i = batchStart; i < batchEnd; i++) {
            const homeClinicId = clinicIds[i % clinicIds.length]!;
            const archetype = PATIENT_ARCHETYPES[i % PATIENT_ARCHETYPES.length]!;
            const patient = patientFactory.build(undefined, {
              userId: userIds[i]!,
              homeClinicId,
              archetypeId: archetype.id,
            });
            batchPatients.push(patient);
            patientToClinic[patient.id] = homeClinicId;
            patientRecords.push(patient);
          }

          const r = await bulkInsert(tx, 'patient', batchPatients, {
            batchSize: BATCH_SIZE,
            skipDuplicates: true,
          });
          created += r.totalInserted;

          // Checkpoint every N batches
          if (Math.floor(batchStart / BATCH_SIZE) % patientsModule.checkpointEveryNBatches === 0) {
            await ctx.saveCheckpoint(Math.floor(batchStart / BATCH_SIZE), created);
            checkpointsSaved++;
          }
        }
      });

      ctx.registry.set(
        REGISTRY_KEYS.PATIENT_IDS,
        patientRecords.map((p) => p.id),
      );
      ctx.registry.set(REGISTRY_KEYS.PATIENT_RECORDS, patientRecords);
      ctx.registry.set(REGISTRY_KEYS.PATIENT_TO_CLINIC, patientToClinic);
      ctx.logger.info(`✓ Patients seeded`, { created, checkpointsSaved });

      return {
        recordsCreated: created,
        recordsSkipped: PATIENT_COUNT - created,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['patient'],
        modelsTouched: ['patient'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved,
        metadata: { archetypes: PATIENT_ARCHETYPES.length, batchSize: BATCH_SIZE },
      };
    }),

  hydrateRegistry: async (ctx) => {
    // Re-populate registry from DB when this module is skipped via idempotency.
    // Downstream modules (clinical.consultations, compliance.dpdp-requests) need these keys.
    const patients = await ctx.prisma.patient.findMany({
      select: {
        id: true,
        userId: true,
        clinicId: true,
        ageYears: true,
        pregnancyStatus: true,
        knownAllergies: true,
        currentMedications: true,
        primaryConditionIcd10: true,
        preferredLocale: true,
      },
    });
    const patientToClinic: Record<string, string> = {};
    for (const p of patients) {
      if (p.clinicId) patientToClinic[p.id] = p.clinicId;
    }
    ctx.registry.set(
      REGISTRY_KEYS.PATIENT_IDS,
      patients.map((p) => p.id),
    );
    ctx.registry.set(REGISTRY_KEYS.PATIENT_RECORDS, patients);
    ctx.registry.set(REGISTRY_KEYS.PATIENT_TO_CLINIC, patientToClinic);
  },

  compensate: async (ctx) => {
    const ids = ctx.registry.get<string[]>(REGISTRY_KEYS.PATIENT_IDS);
    if (ids) await ctx.prisma.patient.deleteMany({ where: { id: { in: ids } } });
  },
});
