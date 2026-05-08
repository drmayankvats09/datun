// ═══════════════════════════════════════════════════════════════
// LEAD FACTORY — Sales pipeline (clinics considering Datun)
// Critical for Mayank's clinic outreach tracking
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';
import { TEST_PHONE_PREFIX } from '../../constants/limits';

type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'DEMO_BOOKED'
  | 'DEMO_COMPLETED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATING'
  | 'CONVERTED'
  | 'LOST'
  | 'NURTURE';
type LeadSource =
  | 'WHATSAPP_OUTREACH'
  | 'INSTAGRAM_DM'
  | 'FACEBOOK_AD'
  | 'REFERRAL'
  | 'WEBSITE'
  | 'COLD_CALL'
  | 'TRADE_SHOW'
  | 'PARTNER_REFERRAL'
  | 'CONTENT_MARKETING'
  | 'GOOGLE_ADS';

interface LeadOutput {
  readonly id: string;
  readonly clinicName: string;
  readonly contactName: string;
  readonly contactRole: string;
  readonly phone: string;
  readonly email: string | null;
  readonly city: string;
  readonly state: string;
  readonly cityTier: 'tier-1' | 'tier-2' | 'tier-3';
  readonly stage: LeadStage;
  readonly source: LeadSource;
  readonly sourceCampaign: string | null;
  readonly assignedToUserId: string;
  readonly clinicSize: 'SOLO' | 'SMALL_2_5_DOCTORS' | 'MEDIUM_6_15' | 'LARGE_16_PLUS';
  readonly currentSoftware: string | null;
  readonly painPoints: readonly string[];
  readonly estimatedMrrInr: number;
  readonly probabilityToClose: number;
  readonly expectedCloseDate: Date | null;
  readonly firstContactAt: Date;
  readonly lastContactAt: Date | null;
  readonly nextFollowupAt: Date | null;
  readonly contactCount: number;
  readonly demoScheduledAt: Date | null;
  readonly demoCompletedAt: Date | null;
  readonly demoFeedback: string | null;
  readonly proposalSentAt: Date | null;
  readonly convertedAt: Date | null;
  readonly lostReason: string | null;
  readonly lostToCompetitor: string | null;
  readonly notes: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface LeadTransient {
  readonly stage?: LeadStage;
  readonly source?: LeadSource;
  readonly cityTier?: 'tier-1' | 'tier-2' | 'tier-3';
}

export const leadFactory = defineFactory<LeadOutput, LeadTransient>({
  name: 'clinic' as 'clinic',
  defaultTransient: {},

  build: ({ sequence, faker, transient }) => {
    const stage =
      transient.stage ??
      faker.helpers.weightedArrayElement([
        { weight: 25, value: 'NEW' as const },
        { weight: 18, value: 'CONTACTED' as const },
        { weight: 12, value: 'NURTURE' as const },
        { weight: 10, value: 'INTERESTED' as const },
        { weight: 8, value: 'LOST' as const },
        { weight: 7, value: 'DEMO_BOOKED' as const },
        { weight: 6, value: 'DEMO_COMPLETED' as const },
        { weight: 5, value: 'PROPOSAL_SENT' as const },
        { weight: 5, value: 'CONVERTED' as const },
        { weight: 4, value: 'NEGOTIATING' as const },
      ]);

    const source =
      transient.source ??
      faker.helpers.weightedArrayElement([
        { weight: 40, value: 'WHATSAPP_OUTREACH' as const },
        { weight: 15, value: 'INSTAGRAM_DM' as const },
        { weight: 12, value: 'WEBSITE' as const },
        { weight: 10, value: 'REFERRAL' as const },
        { weight: 8, value: 'FACEBOOK_AD' as const },
        { weight: 6, value: 'COLD_CALL' as const },
        { weight: 4, value: 'CONTENT_MARKETING' as const },
        { weight: 3, value: 'GOOGLE_ADS' as const },
        { weight: 1, value: 'TRADE_SHOW' as const },
        { weight: 1, value: 'PARTNER_REFERRAL' as const },
      ]);

    const probabilityMap: Record<LeadStage, number> = {
      NEW: 5,
      CONTACTED: 15,
      INTERESTED: 30,
      DEMO_BOOKED: 45,
      DEMO_COMPLETED: 55,
      PROPOSAL_SENT: 65,
      NEGOTIATING: 75,
      CONVERTED: 100,
      LOST: 0,
      NURTURE: 10,
    };

    return {
      id: `lead-${String(sequence).padStart(10, '0')}`,
      clinicName: `${faker.company.name()} Dental Clinic`,
      contactName: `Dr. ${faker.person.firstName()} ${faker.person.lastName()}`,
      contactRole: faker.helpers.arrayElement([
        'Owner',
        'Practice Manager',
        'Senior Dentist',
        'Founder',
      ]),
      phone: `${TEST_PHONE_PREFIX}${String(sequence).padStart(5, '0').slice(-5)}`,
      email: faker.helpers.maybe(() => faker.internet.email(), { probability: 0.65 }) ?? null,
      city: faker.helpers.arrayElement([
        'Delhi',
        'Mumbai',
        'Bangalore',
        'Pune',
        'Hyderabad',
        'Jaipur',
        'Lucknow',
        'Indore',
      ]),
      state: faker.helpers.arrayElement(['DL', 'MH', 'KA', 'TG', 'RJ', 'UP', 'MP']),
      cityTier:
        transient.cityTier ??
        faker.helpers.weightedArrayElement([
          { weight: 40, value: 'tier-1' as const },
          { weight: 40, value: 'tier-2' as const },
          { weight: 20, value: 'tier-3' as const },
        ]),
      stage,
      source,
      sourceCampaign:
        faker.helpers.maybe(() => `q1-2026-outreach-${faker.number.int({ min: 1, max: 10 })}`, {
          probability: 0.4,
        }) ?? null,
      assignedToUserId: 'user-000001',
      clinicSize: faker.helpers.weightedArrayElement([
        { weight: 40, value: 'SOLO' as const },
        { weight: 35, value: 'SMALL_2_5_DOCTORS' as const },
        { weight: 18, value: 'MEDIUM_6_15' as const },
        { weight: 7, value: 'LARGE_16_PLUS' as const },
      ]),
      currentSoftware:
        faker.helpers.maybe(
          () =>
            faker.helpers.arrayElement(['Dentrix', 'Clove', 'PracticePal', 'Excel/Manual', 'None']),
          { probability: 0.6 },
        ) ?? null,
      painPoints: faker.helpers.arrayElements(
        [
          'no-show patients',
          'manual followups',
          'patient acquisition',
          'pricing transparency',
          'inventory management',
          'staff training',
          'consultation documentation',
        ],
        { min: 1, max: 3 },
      ),
      estimatedMrrInr: faker.helpers.arrayElement([999, 1999, 4999, 9999]),
      probabilityToClose: probabilityMap[stage],
      expectedCloseDate:
        stage === 'CONVERTED' || stage === 'LOST' ? null : faker.date.soon({ days: 60 }),
      firstContactAt: faker.date.recent({ days: 90 }),
      lastContactAt: stage !== 'NEW' ? faker.date.recent({ days: 14 }) : null,
      nextFollowupAt:
        stage === 'CONVERTED' || stage === 'LOST' ? null : faker.date.soon({ days: 7 }),
      contactCount: stage === 'NEW' ? 0 : faker.number.int({ min: 1, max: 12 }),
      demoScheduledAt: [
        'DEMO_BOOKED',
        'DEMO_COMPLETED',
        'PROPOSAL_SENT',
        'NEGOTIATING',
        'CONVERTED',
      ].includes(stage)
        ? faker.date.recent({ days: 30 })
        : null,
      demoCompletedAt: ['DEMO_COMPLETED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CONVERTED'].includes(
        stage,
      )
        ? faker.date.recent({ days: 25 })
        : null,
      demoFeedback: ['DEMO_COMPLETED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CONVERTED'].includes(stage)
        ? 'Liked the AI consultation flow'
        : null,
      proposalSentAt: ['PROPOSAL_SENT', 'NEGOTIATING', 'CONVERTED'].includes(stage)
        ? faker.date.recent({ days: 14 })
        : null,
      convertedAt: stage === 'CONVERTED' ? faker.date.recent({ days: 7 }) : null,
      lostReason:
        stage === 'LOST'
          ? faker.helpers.arrayElement([
              'Price too high',
              'Already has alternative',
              'Not ready for tech',
              'No budget',
              'Decision delayed indefinitely',
            ])
          : null,
      lostToCompetitor:
        stage === 'LOST'
          ? (faker.helpers.maybe(
              () => faker.helpers.arrayElement(['Practo', 'Clove', 'in-house solution']),
              { probability: 0.4 },
            ) ?? null)
          : null,
      notes: 'Outreach via WhatsApp template',
      createdAt: faker.date.recent({ days: 90 }),
      updatedAt: new Date(),
    };
  },

  persist: async (lead) => lead,
});
