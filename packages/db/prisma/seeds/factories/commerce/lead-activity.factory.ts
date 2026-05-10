// ═══════════════════════════════════════════════════════════════
// LEAD ACTIVITY FACTORY — Touchpoint history per lead
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type ActivityType =
  | 'WHATSAPP_SENT'
  | 'WHATSAPP_REPLY_RECEIVED'
  | 'CALL_MADE'
  | 'CALL_RECEIVED'
  | 'CALL_MISSED'
  | 'EMAIL_SENT'
  | 'EMAIL_REPLY'
  | 'DEMO_SCHEDULED'
  | 'DEMO_RESCHEDULED'
  | 'DEMO_COMPLETED'
  | 'DEMO_NO_SHOW'
  | 'PROPOSAL_SHARED'
  | 'CONTRACT_SHARED'
  | 'CONTRACT_SIGNED'
  | 'NOTE_ADDED'
  | 'STAGE_CHANGED'
  | 'ASSIGNED'
  | 'TASK_CREATED';

interface LeadActivityOutput {
  readonly id: string;
  readonly leadId: string;
  readonly activityType: ActivityType;
  readonly performedByUserId: string;
  readonly summary: string;
  readonly content: string | null;
  readonly outcome: string | null;
  readonly callDurationSec: number | null;
  readonly emailSubject: string | null;
  readonly attachmentUrls: readonly string[];
  readonly nextActionScheduledAt: Date | null;
  readonly nextActionDescription: string | null;
  readonly performedAt: Date;
  readonly createdAt: Date;
}

interface LeadActivityTransient {
  readonly leadId: string;
  readonly activityType?: ActivityType;
}

export const leadActivityFactory = defineFactory<LeadActivityOutput, LeadActivityTransient>({
  name: 'clinic' as 'clinic',
  defaultTransient: { leadId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const activityType =
      transient.activityType ??
      faker.helpers.weightedArrayElement([
        { weight: 35, value: 'WHATSAPP_SENT' as const },
        { weight: 18, value: 'WHATSAPP_REPLY_RECEIVED' as const },
        { weight: 12, value: 'CALL_MADE' as const },
        { weight: 8, value: 'NOTE_ADDED' as const },
        { weight: 6, value: 'CALL_MISSED' as const },
        { weight: 5, value: 'EMAIL_SENT' as const },
        { weight: 4, value: 'STAGE_CHANGED' as const },
        { weight: 3, value: 'DEMO_SCHEDULED' as const },
        { weight: 2, value: 'DEMO_COMPLETED' as const },
        { weight: 2, value: 'PROPOSAL_SHARED' as const },
        { weight: 1, value: 'CONTRACT_SIGNED' as const },
        { weight: 1, value: 'TASK_CREATED' as const },
        { weight: 1, value: 'ASSIGNED' as const },
        { weight: 1, value: 'CALL_RECEIVED' as const },
        { weight: 1, value: 'EMAIL_REPLY' as const },
      ]);

    return {
      id: `lact-${String(sequence).padStart(12, '0')}`,
      leadId: transient.leadId,
      activityType,
      performedByUserId: 'user-000001',
      summary: `${activityType.replace(/_/g, ' ').toLowerCase()}`,
      content: activityType.includes('WHATSAPP') ? 'Hi, exploring Datun for your clinic?' : null,
      outcome:
        faker.helpers.maybe(
          () =>
            faker.helpers.arrayElement([
              'interested',
              'busy',
              'will-revert',
              'not-now',
              'follow-up-needed',
            ]),
          { probability: 0.6 },
        ) ?? null,
      callDurationSec:
        activityType === 'CALL_MADE' || activityType === 'CALL_RECEIVED'
          ? faker.number.int({ min: 30, max: 1800 })
          : null,
      emailSubject: activityType === 'EMAIL_SENT' ? 'Datun Demo Request' : null,
      attachmentUrls: [],
      nextActionScheduledAt:
        faker.helpers.maybe(() => faker.date.soon({ days: 7 }), { probability: 0.5 }) ?? null,
      nextActionDescription:
        faker.helpers.maybe(() => 'Follow up next week', { probability: 0.5 }) ?? null,
      performedAt: faker.date.recent({ days: 90 }),
      createdAt: new Date(),
    };
  },

  persist: async (activity) => activity,
});
