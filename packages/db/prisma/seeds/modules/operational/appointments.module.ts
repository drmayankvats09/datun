// ═══════════════════════════════════════════════════════════════
// APPOINTMENTS — books based on consultation outcomes
// ~30% of completed consultations book a clinic visit
// ═══════════════════════════════════════════════════════════════

import type { Consultation } from '@prisma/client';
import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { appointmentFactory } from '../../factories/operational/appointment.factory';
import { bulkInsert } from '../../factories/core/bulk-insert';

const BATCH_SIZE = 500;

export const appointmentsModule = defineModule({
  name: 'operational.appointments',
  description: 'Clinic visit appointments from consultations',
  category: 'operational',
  version: '2.0.0',
  dependencies: ['clinical.consultations'],
  modelsTouched: ['appointment'],
  factoriesUsed: ['appointment'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'COUNT_THRESHOLD', modelName: 'appointment', threshold: 500 },
  useTransaction: true,
  transactionTimeoutMs: 120_000,
  consumesRegistryKeys: [
    REGISTRY_KEYS.CONSULTATION_RECORDS,
    REGISTRY_KEYS.PATIENT_TO_CLINIC,
    REGISTRY_KEYS.DOCTOR_IDS,
  ],
  providesRegistryKeys: [REGISTRY_KEYS.APPOINTMENT_IDS],

  checkIdempotency: async (ctx) => (await ctx.prisma.appointment.count()) >= 500,

  run: async (ctx) =>
    measureExecution(appointmentsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 900);

      const consultations = ctx.registry.getRequired<Consultation[]>(
        REGISTRY_KEYS.CONSULTATION_RECORDS,
      );
      const patientToClinic = ctx.registry.getRequired<Record<string, string>>(
        REGISTRY_KEYS.PATIENT_TO_CLINIC,
      );
      const doctorIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.DOCTOR_IDS);

      const appointments: ReturnType<typeof appointmentFactory.build>[] = [];

      for (let i = 0; i < consultations.length; i++) {
        const c = consultations[i]!;
        // Book appointment if completed + (urgent OR severe OR random 30%)
        const shouldBook =
          c.status === 'COMPLETED' &&
          (c.urgency === 'URGENT' || c.urgency === 'EMERGENCY' || i % 10 < 3);
        if (!shouldBook) continue;

        const clinicId = patientToClinic[c.patientId];
        if (!clinicId) continue;

        appointments.push(
          appointmentFactory.build(undefined, {
            patientId: c.patientId,
            clinicId,
            doctorId: c.doctorId ?? doctorIds[i % doctorIds.length]!,
            consultationId: c.id,
            daysFromNow: c.urgency === 'EMERGENCY' ? 0 : c.urgency === 'URGENT' ? 1 : i % 14,
          }),
        );
      }

      let created = 0;
      await runInScope(appointmentsModule, ctx, async (tx) => {
        for (let i = 0; i < appointments.length; i += BATCH_SIZE) {
          const batch = appointments.slice(i, i + BATCH_SIZE);
          const r = await bulkInsert(tx, 'appointment', batch, {
            batchSize: BATCH_SIZE,
            skipDuplicates: true,
          });
          created += r.totalInserted;
        }
      });

      ctx.registry.set(
        REGISTRY_KEYS.APPOINTMENT_IDS,
        appointments.map((a) => a.id),
      );
      ctx.logger.info(`✓ Appointments seeded`, { created });

      return {
        recordsCreated: created,
        recordsSkipped: 0,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['appointment'],
        modelsTouched: ['appointment'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { totalAppointments: appointments.length },
      };
    }),

  compensate: async (ctx) => {
    const ids = ctx.registry.get<string[]>(REGISTRY_KEYS.APPOINTMENT_IDS);
    if (ids) await ctx.prisma.appointment.deleteMany({ where: { id: { in: ids } } });
  },
});
