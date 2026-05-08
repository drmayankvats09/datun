// ═══════════════════════════════════════════════════════════════
// APPOINTMENT FACTORY — Booked appointments at clinic
// Status: REQUESTED, CONFIRMED, RESCHEDULED, CANCELLED, NO_SHOW, COMPLETED
// Realistic distribution: 60% completed, 15% no-show, 10% cancelled, etc.
// ═══════════════════════════════════════════════════════════════

import type { Appointment, AppointmentStatus, PrismaClient } from '@prisma/client';
import { defineFactory } from '../core';

interface AppointmentTransient {
  readonly patientId: string;
  readonly clinicId: string;
  readonly doctorId?: string | null;
  readonly consultationId?: string | null;
  readonly forceStatus?: AppointmentStatus;
  /** Days from now (negative = past, positive = future) */
  readonly daysFromNow?: number;
}

export const appointmentFactory = defineFactory<Appointment, AppointmentTransient>({
  name: 'appointment',
  defaultTransient: { patientId: '', clinicId: '' },

  build: ({ sequence, faker, transient }) => {
    if (!transient.patientId) {
      throw new Error('[appointment.factory] patientId required');
    }
    if (!transient.clinicId) {
      throw new Error('[appointment.factory] clinicId required');
    }

    // ── Realistic status distribution ──
    // Schema enum: SCHEDULED | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW | RESCHEDULED
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

    // Scheduled at — days from now (default: ±30 days)
    const daysOffset = transient.daysFromNow ?? faker.number.int({ min: -60, max: 30 });
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + daysOffset);
    scheduledAt.setHours(faker.number.int({ min: 9, max: 19 }));
    scheduledAt.setMinutes(faker.helpers.arrayElement([0, 15, 30, 45]));
    scheduledAt.setSeconds(0);
    scheduledAt.setMilliseconds(0);

    const durationMinutes = faker.helpers.arrayElement([15, 20, 30, 45, 60]);

    // Procedure type — broad enough for clinic ops
    const procedureType = faker.helpers.weightedArrayElement([
      { weight: 35, value: 'consultation' },
      { weight: 15, value: 'scaling' },
      { weight: 12, value: 'filling' },
      { weight: 10, value: 'rct' },
      { weight: 8, value: 'extraction' },
      { weight: 6, value: 'crown' },
      { weight: 4, value: 'orthodontic-followup' },
      { weight: 4, value: 'whitening' },
      { weight: 3, value: 'implant' },
      { weight: 3, value: 'pediatric' },
    ]);

    return {
      id: `appt-${String(sequence).padStart(8, '0')}`,
      patientId: transient.patientId,
      clinicId: transient.clinicId,
      doctorId: transient.doctorId ?? null,
      consultationId: transient.consultationId ?? null,

      // When + what
      scheduledAt,
      durationMinutes,
      procedureType,
      procedureNotes: null,

      // Status
      status,
      requestedAt: new Date(scheduledAt.getTime() - 7 * 24 * 60 * 60 * 1000),
      confirmedAt:
        status === 'CONFIRMED' || status === 'COMPLETED'
          ? new Date(scheduledAt.getTime() - 3 * 24 * 60 * 60 * 1000)
          : null,
      cancelledAt:
        status === 'CANCELLED' ? new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000) : null,
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
      noShowAt: status === 'NO_SHOW' ? scheduledAt : null,
      completedAt:
        status === 'COMPLETED'
          ? new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000)
          : null,

      // Reminder tracking
      reminder24hSent: daysOffset >= -2 && daysOffset <= 2,
      reminder24hSentAt: null,
      reminder1hSent: daysOffset >= -1 && daysOffset <= 1,
      reminder1hSentAt: null,

      // Booking metadata
      bookingSource: faker.helpers.arrayElement([
        'app',
        'whatsapp',
        'phone-call',
        'walk-in',
        'website',
      ]),

      // Payment (for paid procedures)
      estimatedFeeInr: faker.helpers.arrayElement([200, 500, 800, 1500, 3000, 6000, 12000]),
      paidAmountInr: status === 'COMPLETED' ? faker.number.int({ min: 200, max: 12000 }) : 0,
      paymentMode:
        status === 'COMPLETED'
          ? faker.helpers.arrayElement(['cash', 'upi', 'card', 'insurance'])
          : null,
      paymentStatus: status === 'COMPLETED' ? 'PAID' : 'PENDING',

      createdAt: new Date(scheduledAt.getTime() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as Appointment;
  },

  persist: async (appt, prisma) => {
    return prisma.appointment.upsert({
      where: { id: appt.id },
      create: appt as never,
      update: { updatedAt: new Date() },
    });
  },
});
