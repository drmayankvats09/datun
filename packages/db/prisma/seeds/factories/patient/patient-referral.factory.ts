// ═══════════════════════════════════════════════════════════════
// PATIENT REFERRAL FACTORY — Word-of-mouth viral loop
// Datun must track who referred whom for incentive programs (2031 priority)
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface ReferralOutput {
  readonly id: string;
  readonly referrerPatientId: string;
  readonly referredPatientId: string | null;
  readonly referralCode: string;
  readonly referralChannel:
    | 'WHATSAPP'
    | 'SMS'
    | 'EMAIL'
    | 'IN_APP_SHARE'
    | 'INSTAGRAM'
    | 'WORD_OF_MOUTH';
  readonly status: 'PENDING' | 'CLICKED' | 'SIGNED_UP' | 'CONSULTATION_DONE' | 'EXPIRED';
  readonly clickedAt: Date | null;
  readonly signedUpAt: Date | null;
  readonly consultationDoneAt: Date | null;
  readonly referrerRewardInr: number;
  readonly referrerRewardClaimed: boolean;
  readonly referredDiscountInr: number;
  readonly referredDiscountUsed: boolean;
  readonly campaignId: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

interface ReferralTransient {
  readonly referrerPatientId: string;
  readonly referredPatientId?: string | null;
}

export const patientReferralFactory = defineFactory<ReferralOutput, ReferralTransient>({
  name: 'patient' as 'patient',
  defaultTransient: { referrerPatientId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const status = faker.helpers.weightedArrayElement([
      { weight: 35, value: 'PENDING' as const },
      { weight: 25, value: 'CLICKED' as const },
      { weight: 20, value: 'SIGNED_UP' as const },
      { weight: 15, value: 'CONSULTATION_DONE' as const },
      { weight: 5, value: 'EXPIRED' as const },
    ]);

    const createdAt = faker.date.past({ years: 1 });

    return {
      id: `ref-${String(sequence).padStart(10, '0')}`,
      referrerPatientId: transient.referrerPatientId,
      referredPatientId:
        status === 'SIGNED_UP' || status === 'CONSULTATION_DONE'
          ? (transient.referredPatientId ?? `patient-${String(sequence + 1000).padStart(6, '0')}`)
          : null,
      referralCode: faker.string.alphanumeric(8).toUpperCase(),
      referralChannel: faker.helpers.weightedArrayElement([
        { weight: 60, value: 'WHATSAPP' as const },
        { weight: 15, value: 'IN_APP_SHARE' as const },
        { weight: 10, value: 'WORD_OF_MOUTH' as const },
        { weight: 8, value: 'INSTAGRAM' as const },
        { weight: 5, value: 'SMS' as const },
        { weight: 2, value: 'EMAIL' as const },
      ]),
      status,
      clickedAt: ['CLICKED', 'SIGNED_UP', 'CONSULTATION_DONE'].includes(status)
        ? faker.date.recent({ days: 60 })
        : null,
      signedUpAt: ['SIGNED_UP', 'CONSULTATION_DONE'].includes(status)
        ? faker.date.recent({ days: 45 })
        : null,
      consultationDoneAt: status === 'CONSULTATION_DONE' ? faker.date.recent({ days: 30 }) : null,
      referrerRewardInr: 100,
      referrerRewardClaimed:
        status === 'CONSULTATION_DONE' && faker.datatype.boolean({ probability: 0.7 }),
      referredDiscountInr: 100,
      referredDiscountUsed: status === 'CONSULTATION_DONE',
      campaignId:
        faker.helpers.maybe(() => `campaign-${faker.string.alphanumeric(8)}`, {
          probability: 0.4,
        }) ?? null,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + 90 * 24 * 60 * 60 * 1000),
    };
  },

  persist: async (referral) => referral,
});
