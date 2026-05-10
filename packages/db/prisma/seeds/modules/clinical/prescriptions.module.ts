import type { Consultation, Patient } from '@prisma/client';
import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { prescriptionFactory } from '../../factories/clinical/prescription.factory';
import { bulkInsert } from '../../factories/core/bulk-insert';

const BATCH_SIZE = 500;

export const prescriptionsModule = defineModule({
  name: 'clinical.prescriptions',
  description: 'Prescriptions for ~60% of consultations',
  category: 'clinical',
  version: '2.0.0',
  dependencies: ['clinical.consultations'],
  modelsTouched: ['prescription'],
  factoriesUsed: ['prescription'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'COUNT_THRESHOLD', modelName: 'prescription', threshold: 1000 },
  consumesRegistryKeys: [REGISTRY_KEYS.CONSULTATION_RECORDS, REGISTRY_KEYS.PATIENT_RECORDS],
  providesRegistryKeys: [REGISTRY_KEYS.PRESCRIPTION_IDS],

  checkIdempotency: async (ctx) => (await ctx.prisma.prescription.count()) >= 1000,

  run: async (ctx) =>
    measureExecution(prescriptionsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 600);

      const consultations = ctx.registry.getRequired<Consultation[]>(
        REGISTRY_KEYS.CONSULTATION_RECORDS,
      );
      const patients = ctx.registry.getRequired<Patient[]>(REGISTRY_KEYS.PATIENT_RECORDS);
      const patientById = new Map(patients.map((p) => [p.id, p]));

      const prescriptions: ReturnType<typeof prescriptionFactory.build>[] = [];

      for (const c of consultations) {
        const needsRx =
          c.status === 'COMPLETED' && (c.urgency === 'URGENT' || c.urgency === 'EMERGENCY');
        if (!needsRx) continue;
        const patient = patientById.get(c.patientId);
        if (!patient) continue;
        // Defensive: schema requires userId for Prescription
        if (!patient.userId) continue;

        const allergies = JSON.parse((patient.knownAllergies as string) ?? '[]');
        const meds = JSON.parse((patient.currentMedications as string) ?? '[]');
        const onBT = meds.some((m: string) =>
          ['warfarin', 'aspirin', 'clopidogrel', 'apixaban', 'rivaroxaban', 'dabigatran'].includes(
            m.toLowerCase(),
          ),
        );

        prescriptions.push(
          prescriptionFactory.build(undefined, {
            consultationId: c.id,
            patientId: c.patientId,
            userId: patient.userId, // REQUIRED — User FK
            doctorId: c.doctorId ?? undefined,
            icd10Code: c.primaryDiagnosisIcd10 ?? undefined,
            diagnosisLabel: c.diagnosis ?? undefined,
            patientProfile: {
              ageYears: patient.ageYears ?? 30,
              pregnancyStatus: patient.pregnancyStatus ?? 'NOT_APPLICABLE',
              onBloodThinners: onBT,
              hasRenalImpairment: false,
              hasHepaticImpairment: false,
              allergies,
              currentMedications: meds,
            },
          }),
        );
      }

      let created = 0;
      await runInScope(prescriptionsModule, ctx, async (tx) => {
        for (let i = 0; i < prescriptions.length; i += BATCH_SIZE) {
          const batch = prescriptions.slice(i, i + BATCH_SIZE);
          const r = await bulkInsert(tx, 'prescription', batch, {
            batchSize: BATCH_SIZE,
            skipDuplicates: true,
          });
          created += r.totalInserted;
        }
      });

      ctx.registry.set(
        REGISTRY_KEYS.PRESCRIPTION_IDS,
        prescriptions.map((p) => p.id),
      );
      ctx.logger.info(`✓ Prescriptions seeded`, { created });

      return {
        recordsCreated: created,
        recordsSkipped: consultations.length - prescriptions.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['prescription'],
        modelsTouched: ['prescription'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: {},
      };
    }),

  hydrateRegistry: async (ctx) => {
    const ids = (await ctx.prisma.prescription.findMany({ select: { id: true } })).map((r) => r.id);
    ctx.registry.set(REGISTRY_KEYS.PRESCRIPTION_IDS, ids);
  },

  compensate: async (ctx) => {
    const ids = ctx.registry.get<string[]>(REGISTRY_KEYS.PRESCRIPTION_IDS);
    if (ids) await ctx.prisma.prescription.deleteMany({ where: { id: { in: ids } } });
  },
});
