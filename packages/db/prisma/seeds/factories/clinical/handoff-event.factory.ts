// ═══════════════════════════════════════════════════════════════
// HANDOFF EVENT FACTORY — AI → Doctor handoff state machine
// Tracks the moment AI escalates to human review.
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type HandoffReason =
  | 'EMERGENCY_DETECTED'
  | 'SAFETY_FLAG'
  | 'COMPLEX_CASE'
  | 'PATIENT_REQUESTED_HUMAN'
  | 'AI_LOW_CONFIDENCE'
  | 'SUSPECTED_MALIGNANCY'
  | 'PEDIATRIC_SEDATION_NEEDED'
  | 'PREGNANCY_EDGE_CASE'
  | 'POLYPHARMACY_CONFLICT'
  | 'MENTAL_HEALTH_FLAG'
  | 'LANGUAGE_BARRIER'
  | 'PHOTO_INCONCLUSIVE'
  | 'TREATMENT_FAILURE_REPORT';

type HandoffStatus =
  | 'INITIATED'
  | 'CLAIMED_BY_DOCTOR'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'TIMEOUT'
  | 'CANCELLED';

interface HandoffEventOutput {
  readonly id: string;
  readonly consultationId: string;
  readonly patientId: string;
  readonly fromActorId: string;
  readonly toActorId: string | null;
  readonly handoffReason: HandoffReason;
  readonly handoffNotes: string;
  readonly status: HandoffStatus;
  readonly priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly initiatedAt: Date;
  readonly claimedAt: Date | null;
  readonly resolvedAt: Date | null;
  readonly responseTimeSec: number | null;
  readonly resolutionTimeSec: number | null;
  readonly slaBreached: boolean;
  readonly slaTargetSec: number;
  readonly resolutionType:
    | 'CONTINUED_AI'
    | 'DOCTOR_TAKEOVER'
    | 'IN_PERSON_REFERRAL'
    | 'ER_REFERRAL'
    | 'NO_ACTION_NEEDED'
    | null;
  readonly resolutionNotes: string | null;
  readonly createdAt: Date;
}

interface HandoffEventTransient {
  readonly consultationId: string;
  readonly patientId: string;
  readonly forceReason?: HandoffReason;
}

export const handoffEventFactory = defineFactory<HandoffEventOutput, HandoffEventTransient>({
  name: 'consultation' as 'consultation',
  defaultTransient: { consultationId: 'unknown', patientId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const reason =
      transient.forceReason ??
      faker.helpers.weightedArrayElement([
        { weight: 25, value: 'AI_LOW_CONFIDENCE' as const },
        { weight: 20, value: 'COMPLEX_CASE' as const },
        { weight: 15, value: 'PATIENT_REQUESTED_HUMAN' as const },
        { weight: 10, value: 'SAFETY_FLAG' as const },
        { weight: 8, value: 'EMERGENCY_DETECTED' as const },
        { weight: 6, value: 'PHOTO_INCONCLUSIVE' as const },
        { weight: 5, value: 'POLYPHARMACY_CONFLICT' as const },
        { weight: 4, value: 'PREGNANCY_EDGE_CASE' as const },
        { weight: 3, value: 'PEDIATRIC_SEDATION_NEEDED' as const },
        { weight: 2, value: 'SUSPECTED_MALIGNANCY' as const },
        { weight: 1, value: 'MENTAL_HEALTH_FLAG' as const },
        { weight: 1, value: 'LANGUAGE_BARRIER' as const },
      ]);

    const priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
      reason === 'EMERGENCY_DETECTED' ||
      reason === 'SUSPECTED_MALIGNANCY' ||
      reason === 'MENTAL_HEALTH_FLAG'
        ? 'CRITICAL'
        : reason === 'SAFETY_FLAG' || reason === 'POLYPHARMACY_CONFLICT'
          ? 'HIGH'
          : reason === 'COMPLEX_CASE' || reason === 'PEDIATRIC_SEDATION_NEEDED'
            ? 'MEDIUM'
            : 'LOW';

    const slaTargetSec =
      priorityLevel === 'CRITICAL'
        ? 300
        : priorityLevel === 'HIGH'
          ? 1800
          : priorityLevel === 'MEDIUM'
            ? 7200
            : 86400;

    const status = faker.helpers.weightedArrayElement([
      { weight: 60, value: 'RESOLVED' as const },
      { weight: 15, value: 'IN_PROGRESS' as const },
      { weight: 10, value: 'CLAIMED_BY_DOCTOR' as const },
      { weight: 8, value: 'INITIATED' as const },
      { weight: 5, value: 'TIMEOUT' as const },
      { weight: 2, value: 'CANCELLED' as const },
    ]);

    const initiatedAt = faker.date.recent({ days: 30 });
    const claimedAt = ['CLAIMED_BY_DOCTOR', 'IN_PROGRESS', 'RESOLVED'].includes(status)
      ? new Date(initiatedAt.getTime() + faker.number.int({ min: 30, max: 3600 }) * 1000)
      : null;
    const resolvedAt =
      status === 'RESOLVED'
        ? new Date(initiatedAt.getTime() + faker.number.int({ min: 600, max: 86400 }) * 1000)
        : null;

    return {
      id: `handoff-${String(sequence).padStart(10, '0')}`,
      consultationId: transient.consultationId,
      patientId: transient.patientId,
      fromActorId: 'ai-system',
      toActorId: claimedAt
        ? `doctor-${String(faker.number.int({ min: 1, max: 200 })).padStart(6, '0')}`
        : null,
      handoffReason: reason,
      handoffNotes: `AI flagged ${reason.replace(/_/g, ' ').toLowerCase()} during consultation`,
      status,
      priorityLevel,
      initiatedAt,
      claimedAt,
      resolvedAt,
      responseTimeSec: claimedAt
        ? Math.floor((claimedAt.getTime() - initiatedAt.getTime()) / 1000)
        : null,
      resolutionTimeSec: resolvedAt
        ? Math.floor((resolvedAt.getTime() - initiatedAt.getTime()) / 1000)
        : null,
      slaBreached: claimedAt
        ? (claimedAt.getTime() - initiatedAt.getTime()) / 1000 > slaTargetSec
        : false,
      slaTargetSec,
      resolutionType:
        status === 'RESOLVED'
          ? faker.helpers.weightedArrayElement([
              { weight: 35, value: 'DOCTOR_TAKEOVER' as const },
              { weight: 30, value: 'IN_PERSON_REFERRAL' as const },
              { weight: 20, value: 'CONTINUED_AI' as const },
              { weight: 8, value: 'NO_ACTION_NEEDED' as const },
              { weight: 7, value: 'ER_REFERRAL' as const },
            ])
          : null,
      resolutionNotes: status === 'RESOLVED' ? 'Resolved per protocol' : null,
      createdAt: initiatedAt,
    };
  },

  persist: async (handoff) => handoff,
});
