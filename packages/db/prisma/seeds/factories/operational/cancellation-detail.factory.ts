// ═══════════════════════════════════════════════════════════════
// CANCELLATION DETAIL FACTORY — Detailed analytics on why patients cancel
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type DetailedReason =
  | 'PATIENT_FELT_BETTER'
  | 'WORK_CONFLICT'
  | 'TRAVEL'
  | 'FAMILY_EMERGENCY'
  | 'WEATHER_FLOOD'
  | 'WEATHER_HEAT'
  | 'TRAFFIC'
  | 'TRANSPORT_STRIKE'
  | 'FINANCIAL_TIGHT'
  | 'FINANCIAL_INSURANCE_PENDING'
  | 'FINANCIAL_LOAN_PROCESSING'
  | 'CLINIC_FAR'
  | 'CLINIC_REVIEWS_NEGATIVE'
  | 'GOT_SECOND_OPINION'
  | 'DOCTOR_UNAVAILABLE'
  | 'DOCTOR_LATE_PREVIOUSLY'
  | 'CHANGED_CLINIC'
  | 'PREGNANCY_COMPLICATIONS'
  | 'CHILDCARE_ISSUE'
  | 'OTHER_HEALTH_ISSUE'
  | 'FORGOT'
  | 'NEVER_INTENDED'
  | 'DUPLICATE_BOOKING'
  | 'AI_RECOMMENDED_DELAY'
  | 'COVID_OR_OTHER_INFECTION'
  | 'OTHER';

interface CancellationDetailOutput {
  readonly id: string;
  readonly appointmentId: string;
  readonly patientId: string;
  readonly cancelledByRole: 'PATIENT' | 'CLINIC' | 'DOCTOR' | 'SYSTEM_AUTO';
  readonly cancelledAt: Date;
  readonly noticeMinutes: number;
  readonly primaryReason: DetailedReason;
  readonly secondaryReasons: readonly DetailedReason[];
  readonly patientFeedback: string | null;
  readonly cancellationFeeInr: number;
  readonly refundIssued: boolean;
  readonly refundAmountInr: number;
  readonly rebookOffered: boolean;
  readonly rebooked: boolean;
  readonly rebookedAppointmentId: string | null;
  readonly aiSentimentAnalysis: object;
  readonly retentionAttempted: boolean;
  readonly retentionSuccessful: boolean;
  readonly createdAt: Date;
}

interface CancellationDetailTransient {
  readonly appointmentId: string;
  readonly patientId: string;
}

export const cancellationDetailFactory = defineFactory<
  CancellationDetailOutput,
  CancellationDetailTransient
>({
  name: 'appointment' as 'appointment',
  defaultTransient: { appointmentId: 'unknown', patientId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const noticeMinutes = faker.number.int({ min: 0, max: 10080 });
    const cancelledByRole = faker.helpers.weightedArrayElement([
      { weight: 75, value: 'PATIENT' as const },
      { weight: 15, value: 'CLINIC' as const },
      { weight: 7, value: 'DOCTOR' as const },
      { weight: 3, value: 'SYSTEM_AUTO' as const },
    ]);

    const primaryReason = faker.helpers.weightedArrayElement([
      { weight: 18, value: 'PATIENT_FELT_BETTER' as const },
      { weight: 15, value: 'WORK_CONFLICT' as const },
      { weight: 10, value: 'FINANCIAL_TIGHT' as const },
      { weight: 8, value: 'TRAFFIC' as const },
      { weight: 7, value: 'GOT_SECOND_OPINION' as const },
      { weight: 6, value: 'TRAVEL' as const },
      { weight: 6, value: 'FAMILY_EMERGENCY' as const },
      { weight: 5, value: 'FINANCIAL_INSURANCE_PENDING' as const },
      { weight: 5, value: 'WEATHER_HEAT' as const },
      { weight: 4, value: 'CLINIC_FAR' as const },
      { weight: 3, value: 'FORGOT' as const },
      { weight: 3, value: 'CHILDCARE_ISSUE' as const },
      { weight: 3, value: 'DOCTOR_UNAVAILABLE' as const },
      { weight: 2, value: 'DUPLICATE_BOOKING' as const },
      { weight: 2, value: 'PREGNANCY_COMPLICATIONS' as const },
      { weight: 1, value: 'COVID_OR_OTHER_INFECTION' as const },
      { weight: 1, value: 'AI_RECOMMENDED_DELAY' as const },
      { weight: 1, value: 'OTHER' as const },
    ]);

    return {
      id: `cancel-${String(sequence).padStart(10, '0')}`,
      appointmentId: transient.appointmentId,
      patientId: transient.patientId,
      cancelledByRole,
      cancelledAt: faker.date.recent({ days: 60 }),
      noticeMinutes,
      primaryReason,
      secondaryReasons:
        faker.helpers.maybe(
          () =>
            faker.helpers.arrayElements(
              ['WORK_CONFLICT', 'TRAFFIC', 'FORGOT', 'FINANCIAL_TIGHT'] as const,
              { min: 1, max: 2 },
            ),
          { probability: 0.3 },
        ) ?? [],
      patientFeedback:
        faker.helpers.maybe(() => 'Sorry, will reschedule next week', { probability: 0.4 }) ?? null,
      cancellationFeeInr: noticeMinutes < 60 && cancelledByRole === 'PATIENT' ? 200 : 0,
      refundIssued: cancelledByRole !== 'PATIENT' || noticeMinutes >= 1440,
      refundAmountInr:
        cancelledByRole !== 'PATIENT'
          ? 500
          : noticeMinutes >= 1440
            ? 500
            : noticeMinutes >= 60
              ? 300
              : 0,
      rebookOffered: faker.datatype.boolean({ probability: 0.85 }),
      rebooked: faker.datatype.boolean({ probability: 0.45 }),
      rebookedAppointmentId:
        faker.helpers.maybe(
          () => `appt-${String(faker.number.int({ min: 1, max: 10000 })).padStart(8, '0')}`,
          { probability: 0.45 },
        ) ?? null,
      aiSentimentAnalysis: {
        sentiment: faker.helpers.arrayElement(['neutral', 'apologetic', 'frustrated']),
        confidence: faker.number.float({ min: 0.7, max: 0.99 }),
      },
      retentionAttempted: faker.datatype.boolean({ probability: 0.7 }),
      retentionSuccessful: faker.datatype.boolean({ probability: 0.4 }),
      createdAt: new Date(),
    };
  },

  persist: async (detail) => detail,
});
