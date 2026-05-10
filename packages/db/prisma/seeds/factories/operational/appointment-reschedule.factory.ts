// ═══════════════════════════════════════════════════════════════
// APPOINTMENT RESCHEDULE HISTORY FACTORY
// Tracks every reschedule before final slot — useful for analytics
//
// DETERMINISM CONTRACT (Day 16 fix):
// `defaultTransient` MUST be evaluated to literal constants — NOT
// `new Date()`. JavaScript captures the load-time wall-clock into a
// fixed Date instance, which then drifts the snapshot's computed
// `noticeMinutes` field every minute the test re-runs (the field
// derives from `previousScheduledAt.getTime() - Date.now()`).
//
// Production callers (flow-events.module) ALWAYS pass an explicit
// `previousScheduledAt`, so this default is only consumed by
// snapshot/contract tests where determinism wins.
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

/**
 * Canonical fixture dates — chosen ~76 days after the snapshot test's
 * frozen instant (2026-01-15) so `noticeMinutes` is a stable positive
 * number (~110160) regardless of when the test runs.
 */
const FIXTURE_PREVIOUS_SCHEDULED = new Date('2026-04-01T00:00:00.000Z');
const FIXTURE_NEW_SCHEDULED = new Date('2026-04-08T00:00:00.000Z');

type RescheduleReason =
  | 'PATIENT_BUSY'
  | 'PATIENT_FEELING_BETTER'
  | 'CLINIC_HOLIDAY'
  | 'DOCTOR_UNAVAILABLE'
  | 'EMERGENCY_PRIORITY'
  | 'TRAVEL'
  | 'WEATHER'
  | 'TRAFFIC'
  | 'FINANCIAL'
  | 'INSURANCE_PROCESSING';

interface RescheduleOutput {
  readonly id: string;
  readonly appointmentId: string;
  readonly previousScheduledAt: Date;
  readonly newScheduledAt: Date;
  readonly rescheduledAt: Date;
  readonly rescheduledBy: 'PATIENT' | 'CLINIC' | 'DOCTOR' | 'SYSTEM';
  readonly rescheduledByUserId: string;
  readonly reason: RescheduleReason;
  readonly noticeMinutes: number;
  readonly chargesAppliedInr: number;
  readonly createdAt: Date;
}

interface RescheduleTransient {
  readonly appointmentId: string;
  readonly previousScheduledAt: Date;
  readonly newScheduledAt: Date;
  readonly rescheduledByUserId: string;
}

export const appointmentRescheduleFactory = defineFactory<RescheduleOutput, RescheduleTransient>({
  name: 'appointment' as 'appointment',
  defaultTransient: {
    appointmentId: 'unknown',
    previousScheduledAt: FIXTURE_PREVIOUS_SCHEDULED,
    newScheduledAt: FIXTURE_NEW_SCHEDULED,
    rescheduledByUserId: 'unknown',
  },

  build: ({ sequence, faker, transient }) => {
    const noticeMinutes = Math.floor(
      (transient.previousScheduledAt.getTime() - Date.now()) / 60000,
    );
    return {
      id: `resched-${String(sequence).padStart(10, '0')}`,
      appointmentId: transient.appointmentId,
      previousScheduledAt: transient.previousScheduledAt,
      newScheduledAt: transient.newScheduledAt,
      rescheduledAt: faker.date.recent({ days: 30 }),
      rescheduledBy: faker.helpers.weightedArrayElement([
        { weight: 70, value: 'PATIENT' as const },
        { weight: 20, value: 'CLINIC' as const },
        { weight: 8, value: 'DOCTOR' as const },
        { weight: 2, value: 'SYSTEM' as const },
      ]),
      rescheduledByUserId: transient.rescheduledByUserId,
      reason: faker.helpers.weightedArrayElement([
        { weight: 30, value: 'PATIENT_BUSY' as const },
        { weight: 15, value: 'TRAFFIC' as const },
        { weight: 12, value: 'TRAVEL' as const },
        { weight: 10, value: 'PATIENT_FEELING_BETTER' as const },
        { weight: 8, value: 'CLINIC_HOLIDAY' as const },
        { weight: 8, value: 'DOCTOR_UNAVAILABLE' as const },
        { weight: 7, value: 'EMERGENCY_PRIORITY' as const },
        { weight: 5, value: 'FINANCIAL' as const },
        { weight: 3, value: 'WEATHER' as const },
        { weight: 2, value: 'INSURANCE_PROCESSING' as const },
      ]),
      noticeMinutes: Math.max(0, noticeMinutes),
      chargesAppliedInr: noticeMinutes < 60 ? 200 : 0,
      createdAt: faker.date.recent({ days: 30 }),
    };
  },

  persist: async (resched) => resched,
});
