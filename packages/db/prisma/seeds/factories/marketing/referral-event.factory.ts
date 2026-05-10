// ═══════════════════════════════════════════════════════════════
// REFERRAL EVENT FACTORY — Granular referral funnel events
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface ReferralEventOutput {
  readonly id: string;
  readonly referralId: string;
  readonly eventType:
    | 'CODE_GENERATED'
    | 'CODE_SHARED'
    | 'CODE_VIEWED'
    | 'CODE_CLICKED'
    | 'SIGNUP_INITIATED'
    | 'SIGNUP_COMPLETED'
    | 'CONSULTATION_STARTED'
    | 'CONSULTATION_COMPLETED'
    | 'REWARD_QUEUED'
    | 'REWARD_CREDITED'
    | 'REWARD_REDEEMED'
    | 'EXPIRED';
  readonly metadata: object;
  readonly occurredAt: Date;
  readonly createdAt: Date;
}

interface ReferralEventTransient {
  readonly referralId: string;
  readonly eventType?: ReferralEventOutput['eventType'];
}

export const referralEventFactory = defineFactory<ReferralEventOutput, ReferralEventTransient>({
  name: 'patient' as 'patient',
  defaultTransient: { referralId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const eventType =
      transient.eventType ??
      faker.helpers.weightedArrayElement([
        { weight: 30, value: 'CODE_GENERATED' as const },
        { weight: 20, value: 'CODE_SHARED' as const },
        { weight: 15, value: 'CODE_VIEWED' as const },
        { weight: 10, value: 'CODE_CLICKED' as const },
        { weight: 8, value: 'SIGNUP_COMPLETED' as const },
        { weight: 6, value: 'CONSULTATION_COMPLETED' as const },
        { weight: 4, value: 'REWARD_CREDITED' as const },
        { weight: 3, value: 'REWARD_REDEEMED' as const },
        { weight: 2, value: 'EXPIRED' as const },
        { weight: 1, value: 'SIGNUP_INITIATED' as const },
        { weight: 1, value: 'REWARD_QUEUED' as const },
      ]);

    return {
      id: `refevt-${String(sequence).padStart(12, '0')}`,
      referralId: transient.referralId,
      eventType,
      metadata: {},
      occurredAt: faker.date.recent({ days: 90 }),
      createdAt: new Date(),
    };
  },

  persist: async (event) => event,
});
