// ═══════════════════════════════════════════════════════════════
// FOLLOWUP CONVERSATION FACTORY — Patient replies to 3-day/7-day pings
// Most factories track outbound only; this captures inbound responses.
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type FollowupType =
  | 'AUTO_3DAY'
  | 'AUTO_7DAY'
  | 'MANUAL_DOCTOR_CHECKIN'
  | 'POST_PROCEDURE_CHECK'
  | 'MEDICATION_REFILL_PROMPT';
type FollowupOutcome =
  | 'IMPROVED'
  | 'STABLE'
  | 'WORSENED'
  | 'NEW_SYMPTOM'
  | 'NO_RESPONSE'
  | 'DOCTOR_REQUESTED'
  | 'EMERGENCY_DETECTED';

interface FollowupConversationOutput {
  readonly id: string;
  readonly originalConsultationId: string;
  readonly patientId: string;
  readonly type: FollowupType;
  readonly outboundSentAt: Date;
  readonly outboundMessage: string;
  readonly outboundChannel: 'WHATSAPP' | 'SMS' | 'IN_APP' | 'EMAIL';
  readonly outboundDelivered: boolean;
  readonly outboundRead: boolean;
  readonly responseReceivedAt: Date | null;
  readonly responseText: string | null;
  readonly responseLocale:
    | 'hindi'
    | 'english'
    | 'punjabi'
    | 'bengali'
    | 'tamil'
    | 'telugu'
    | 'marathi'
    | 'gujarati'
    | null;
  readonly outcome: FollowupOutcome;
  readonly aiOutcomeClassificationConfidence: number | null;
  readonly secondaryConsultationCreated: boolean;
  readonly secondaryConsultationId: string | null;
  readonly escalatedToDoctor: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface FollowupConversationTransient {
  readonly originalConsultationId: string;
  readonly patientId: string;
  readonly type?: FollowupType;
}

export const followupConversationFactory = defineFactory<
  FollowupConversationOutput,
  FollowupConversationTransient
>({
  name: 'consultation' as 'consultation',
  defaultTransient: { originalConsultationId: 'unknown', patientId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const type =
      transient.type ??
      faker.helpers.weightedArrayElement([
        { weight: 50, value: 'AUTO_3DAY' as const },
        { weight: 30, value: 'AUTO_7DAY' as const },
        { weight: 8, value: 'POST_PROCEDURE_CHECK' as const },
        { weight: 7, value: 'MEDICATION_REFILL_PROMPT' as const },
        { weight: 5, value: 'MANUAL_DOCTOR_CHECKIN' as const },
      ]);

    const outboundSentAt = faker.date.recent({ days: 30 });
    const responseReceived = faker.datatype.boolean({ probability: 0.55 });

    const outcome = !responseReceived
      ? 'NO_RESPONSE'
      : faker.helpers.weightedArrayElement([
          { weight: 55, value: 'IMPROVED' as const },
          { weight: 20, value: 'STABLE' as const },
          { weight: 12, value: 'WORSENED' as const },
          { weight: 7, value: 'NEW_SYMPTOM' as const },
          { weight: 4, value: 'DOCTOR_REQUESTED' as const },
          { weight: 2, value: 'EMERGENCY_DETECTED' as const },
        ]);

    return {
      id: `followup-${String(sequence).padStart(10, '0')}`,
      originalConsultationId: transient.originalConsultationId,
      patientId: transient.patientId,
      type,
      outboundSentAt,
      outboundMessage:
        type === 'AUTO_3DAY'
          ? 'Aap kaisa feel kar rahe hain?'
          : type === 'AUTO_7DAY'
            ? 'Treatment kaisa progress hai?'
            : 'Doctor check-in',
      outboundChannel: faker.helpers.arrayElement(['WHATSAPP', 'SMS', 'IN_APP'] as const),
      outboundDelivered: faker.datatype.boolean({ probability: 0.93 }),
      outboundRead: faker.datatype.boolean({ probability: 0.78 }),
      responseReceivedAt: responseReceived
        ? new Date(outboundSentAt.getTime() + faker.number.int({ min: 60, max: 86400 }) * 1000)
        : null,
      responseText: responseReceived
        ? faker.helpers.arrayElement([
            'Bahut accha feel ho raha hai, dard kam ho gaya',
            'Theek hu doctor sahab',
            'Halka dard hai abhi bhi',
            'Sujan kam ho gayi but kabhi-kabhi tingling hoti hai',
            'Mujhe lagta hai doctor se milna padega',
          ])
        : null,
      responseLocale: responseReceived ? 'hindi' : null,
      outcome,
      aiOutcomeClassificationConfidence: responseReceived
        ? faker.number.float({ min: 0.7, max: 0.99 })
        : null,
      secondaryConsultationCreated: outcome === 'WORSENED' || outcome === 'NEW_SYMPTOM',
      secondaryConsultationId:
        outcome === 'WORSENED' || outcome === 'NEW_SYMPTOM'
          ? `consultation-${String(faker.number.int({ min: 1, max: 100000 })).padStart(8, '0')}`
          : null,
      escalatedToDoctor: outcome === 'EMERGENCY_DETECTED' || outcome === 'DOCTOR_REQUESTED',
      createdAt: outboundSentAt,
      updatedAt: new Date(),
    };
  },

  persist: async (followup) => followup,
});
