// ═══════════════════════════════════════════════════════════════
// APPOINTMENT FACTORY — Booked appointments at clinic
//
// SCHEMA-ALIGNED v2.0 — only fields that exist in `model Appointment`.
// Earlier version generated phantom fields (procedureType, procedureNotes,
// reminder24hSent, bookingSource, estimatedFeeInr, paidAmountInr, etc.) that
// crashed bulkInsert. Schema's REQUIRED `userId` is now populated.
//
// REQUIRED inputs (transient):
//   • patientId (UUID)
//   • userId    (UUID — patient's User FK)
//   • clinicId  (UUID)
// ═══════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto';
import type {
  Appointment,
  AppointmentSource,
  AppointmentStatus,
  AppointmentType,
} from '@prisma/client';
import { defineFactory } from '../core';

interface AppointmentTransient {
  readonly patientId: string;
  /** REQUIRED — User FK (patient's user account) */
  readonly userId: string;
  readonly clinicId: string;
  readonly doctorId?: string | null;
  readonly consultationId?: string | null;
  readonly forceStatus?: AppointmentStatus;
  readonly forceType?: AppointmentType;
  /** Days from now (negative = past, positive = future) */
  readonly daysFromNow?: number;
  readonly chiefComplaint?: string;
}

export const appointmentFactory = defineFactory<Appointment, AppointmentTransient>({
  name: 'appointment',
  defaultTransient: { patientId: '', userId: '', clinicId: '' },

  build: ({ faker, transient }) => {
    if (!transient.patientId) {
      throw new Error('[appointment.factory] patientId required');
    }
    if (!transient.userId) {
      throw new Error('[appointment.factory] userId required');
    }
    if (!transient.clinicId) {
      throw new Error('[appointment.factory] clinicId required');
    }

    // ── Status (schema enum) ──
    const status: AppointmentStatus =
      transient.forceStatus ??
      faker.helpers.weightedArrayElement<AppointmentStatus>([
        { weight: 55, value: 'COMPLETED' },
        { weight: 15, value: 'CONFIRMED' },
        { weight: 10, value: 'NO_SHOW' },
        { weight: 7, value: 'CANCELLED' },
        { weight: 5, value: 'SCHEDULED' },
        { weight: 5, value: 'IN_PROGRESS' },
        { weight: 3, value: 'RESCHEDULED' },
      ]);

    // ── Type (schema enum: FIRST_VISIT, FOLLOW_UP, EMERGENCY, ROUTINE_CHECKUP) ──
    const type: AppointmentType =
      transient.forceType ??
      faker.helpers.weightedArrayElement<AppointmentType>([
        { weight: 50, value: 'FIRST_VISIT' },
        { weight: 30, value: 'FOLLOW_UP' },
        { weight: 15, value: 'ROUTINE_CHECKUP' },
        { weight: 5, value: 'EMERGENCY' },
      ]);

    // Scheduled at — days from now (default ±30)
    const daysOffset = transient.daysFromNow ?? faker.number.int({ min: -60, max: 30 });
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + daysOffset);
    scheduledAt.setHours(faker.number.int({ min: 9, max: 19 }));
    scheduledAt.setMinutes(faker.helpers.arrayElement([0, 15, 30, 45]));
    scheduledAt.setSeconds(0);
    scheduledAt.setMilliseconds(0);

    const durationMinutes = faker.helpers.arrayElement([15, 20, 30, 45, 60]);

    // ── Source (schema enum: DATUN_AI, DIRECT, PHONE, WALKIN) ──
    const sourceChannel: AppointmentSource = faker.helpers.weightedArrayElement<AppointmentSource>([
      { weight: 40, value: 'DATUN_AI' },
      { weight: 30, value: 'DIRECT' },
      { weight: 20, value: 'PHONE' },
      { weight: 10, value: 'WALKIN' },
    ]);

    // Construct an object matching Prisma's AppointmentUncheckedCreateInput shape exactly.
    return {
      id: randomUUID(),
      patientId: transient.patientId,
      userId: transient.userId,
      clinicId: transient.clinicId,
      doctorId: transient.doctorId ?? null,
      consultationId: transient.consultationId ?? null,
      leadId: null,

      // When + duration
      scheduledAt,
      durationMinutes,
      timezone: 'Asia/Kolkata',

      // Status + type
      status,
      type,

      // Clinical context
      chiefComplaint: transient.chiefComplaint ?? null,
      urgency: null,
      notes: null,

      // Lifecycle timestamps
      cancelledAt:
        status === 'CANCELLED' ? new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000) : null,
      cancelledById: null,
      cancellationReason:
        status === 'CANCELLED'
          ? faker.helpers.arrayElement([
              'patient-busy',
              'feeling-better',
              'rescheduled-elsewhere',
              'financial',
              'other',
            ])
          : null,
      reminderSentAt:
        daysOffset >= -2 && daysOffset <= 2
          ? new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)
          : null,
      confirmedAt:
        status === 'CONFIRMED' || status === 'COMPLETED' || status === 'IN_PROGRESS'
          ? new Date(scheduledAt.getTime() - 3 * 24 * 60 * 60 * 1000)
          : null,
      checkInAt: status === 'IN_PROGRESS' || status === 'COMPLETED' ? scheduledAt : null,
      startedAt: status === 'IN_PROGRESS' || status === 'COMPLETED' ? scheduledAt : null,
      endedAt:
        status === 'COMPLETED'
          ? new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000)
          : null,
      completedAt:
        status === 'COMPLETED'
          ? new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000)
          : null,

      rescheduledFromId: null,
      patientFeedbackScore:
        status === 'COMPLETED'
          ? (faker.helpers.maybe(() => faker.number.int({ min: 3, max: 5 }), {
              probability: 0.4,
            }) ?? null)
          : null,

      // Payment (schema uses paisa, not INR — multiply by 100)
      amountPaisa:
        status === 'COMPLETED'
          ? faker.helpers.arrayElement([20000, 50000, 80000, 150000, 300000, 600000, 1200000])
          : null,
      paymentStatus: status === 'COMPLETED' ? 'PAID' : 'PENDING',

      // Source
      sourceChannel,
      metadata: null,

      // Timestamps (schema defaults but explicit)
      createdAt: new Date(scheduledAt.getTime() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    } as unknown as Appointment;
  },

  persist: async (appt, prisma) => {
    return prisma.appointment.upsert({
      where: { id: (appt as { id: string }).id },
      create: appt as never,
      update: { updatedAt: new Date() },
    });
  },
});
