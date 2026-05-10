// ═══════════════════════════════════════════════════════════════
// MARKETING CAMPAIGN FACTORY — Email/WhatsApp/Push campaigns
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type CampaignChannel =
  | 'WHATSAPP'
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'IN_APP_BANNER'
  | 'INSTAGRAM'
  | 'GOOGLE_ADS'
  | 'FACEBOOK_ADS';
type CampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

interface CampaignOutput {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly channel: CampaignChannel;
  readonly status: CampaignStatus;
  readonly objective:
    | 'AWARENESS'
    | 'ACQUISITION'
    | 'ACTIVATION'
    | 'RETENTION'
    | 'REVENUE'
    | 'REFERRAL'
    | 'WIN_BACK';
  readonly targetAudienceQuery: object;
  readonly targetAudienceSize: number;
  readonly contentVariants: object;
  readonly scheduledStartAt: Date;
  readonly scheduledEndAt: Date | null;
  readonly actualStartedAt: Date | null;
  readonly actualEndedAt: Date | null;
  readonly budgetInr: number;
  readonly spentInr: number;
  readonly impressions: number;
  readonly clicks: number;
  readonly conversions: number;
  readonly revenueGeneratedInr: number;
  readonly cpcInr: number;
  readonly ctrPercent: number;
  readonly conversionRate: number;
  readonly roas: number;
  readonly experimentVariants: number;
  readonly winningVariant: string | null;
  readonly createdByUserId: string;
  readonly tags: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface CampaignTransient {
  readonly channel?: CampaignChannel;
}

export const campaignFactory = defineFactory<CampaignOutput, CampaignTransient>({
  name: 'user' as 'user',
  defaultTransient: {},

  build: ({ sequence, faker, transient }) => {
    const channel =
      transient.channel ??
      faker.helpers.weightedArrayElement([
        { weight: 30, value: 'WHATSAPP' as const },
        { weight: 20, value: 'INSTAGRAM' as const },
        { weight: 15, value: 'EMAIL' as const },
        { weight: 12, value: 'GOOGLE_ADS' as const },
        { weight: 10, value: 'FACEBOOK_ADS' as const },
        { weight: 6, value: 'PUSH' as const },
        { weight: 4, value: 'IN_APP_BANNER' as const },
        { weight: 3, value: 'SMS' as const },
      ]);

    const status = faker.helpers.weightedArrayElement([
      { weight: 40, value: 'COMPLETED' as const },
      { weight: 20, value: 'RUNNING' as const },
      { weight: 15, value: 'SCHEDULED' as const },
      { weight: 10, value: 'DRAFT' as const },
      { weight: 7, value: 'PAUSED' as const },
      { weight: 5, value: 'CANCELLED' as const },
      { weight: 3, value: 'FAILED' as const },
    ]);

    const targetSize = faker.number.int({ min: 100, max: 100000 });
    const impressions =
      status === 'COMPLETED' || status === 'RUNNING'
        ? Math.floor(targetSize * faker.number.float({ min: 0.5, max: 0.95 }))
        : 0;
    const clicks = Math.floor(impressions * faker.number.float({ min: 0.01, max: 0.15 }));
    const conversions = Math.floor(clicks * faker.number.float({ min: 0.02, max: 0.25 }));
    const revenueInr = conversions * faker.number.int({ min: 100, max: 5000 });
    const budgetInr = faker.number.int({ min: 5000, max: 500000 });
    const spentInr =
      status === 'COMPLETED'
        ? budgetInr
        : Math.floor(budgetInr * faker.number.float({ min: 0.1, max: 0.95 }));

    return {
      id: `camp-${String(sequence).padStart(10, '0')}`,
      name: `${channel} Campaign ${sequence}`,
      slug: `campaign-${sequence}`,
      channel,
      status,
      objective: faker.helpers.weightedArrayElement([
        { weight: 30, value: 'ACQUISITION' as const },
        { weight: 20, value: 'ACTIVATION' as const },
        { weight: 15, value: 'AWARENESS' as const },
        { weight: 12, value: 'RETENTION' as const },
        { weight: 10, value: 'REVENUE' as const },
        { weight: 8, value: 'REFERRAL' as const },
        { weight: 5, value: 'WIN_BACK' as const },
      ]),
      targetAudienceQuery: { tier: 'tier-2', has_consultation: true },
      targetAudienceSize: targetSize,
      contentVariants: { variantA: 'message-1', variantB: 'message-2' },
      scheduledStartAt: faker.date.recent({ days: 60 }),
      scheduledEndAt:
        faker.helpers.maybe(() => faker.date.soon({ days: 30 }), { probability: 0.7 }) ?? null,
      actualStartedAt: ['RUNNING', 'COMPLETED', 'PAUSED'].includes(status)
        ? faker.date.recent({ days: 30 })
        : null,
      actualEndedAt: status === 'COMPLETED' ? faker.date.recent({ days: 7 }) : null,
      budgetInr,
      spentInr,
      impressions,
      clicks,
      conversions,
      revenueGeneratedInr: revenueInr,
      cpcInr: clicks > 0 ? spentInr / clicks : 0,
      ctrPercent: impressions > 0 ? (clicks / impressions) * 100 : 0,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
      roas: spentInr > 0 ? revenueInr / spentInr : 0,
      experimentVariants: faker.number.int({ min: 1, max: 4 }),
      winningVariant:
        status === 'COMPLETED' ? faker.helpers.arrayElement(['variantA', 'variantB']) : null,
      createdByUserId: 'user-000001',
      tags: faker.helpers.arrayElements(['acquisition', 'q1-2026', 'tier-2', 'whatsapp'], {
        min: 1,
        max: 3,
      }),
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
    };
  },

  persist: async (campaign) => campaign,
});
