// ═══════════════════════════════════════════════════════════════
// UTM ATTRIBUTION FACTORY — Per-touchpoint marketing attribution
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface UtmAttributionOutput {
  readonly id: string;
  readonly userId: string | null;
  readonly anonymousId: string;
  readonly utmSource: string;
  readonly utmMedium: string;
  readonly utmCampaign: string;
  readonly utmContent: string | null;
  readonly utmTerm: string | null;
  readonly campaignId: string | null;
  readonly landingPage: string;
  readonly referrer: string | null;
  readonly deviceType: 'MOBILE' | 'DESKTOP' | 'TABLET';
  readonly osName: string;
  readonly browserName: string;
  readonly ipAddress: string;
  readonly geoCity: string;
  readonly attributionModel:
    | 'FIRST_CLICK'
    | 'LAST_CLICK'
    | 'LINEAR'
    | 'TIME_DECAY'
    | 'POSITION_BASED'
    | 'DATA_DRIVEN';
  readonly touchpointSequence: number;
  readonly conversionEvent: string | null;
  readonly conversionValueInr: number;
  readonly capturedAt: Date;
  readonly createdAt: Date;
}

interface UtmAttributionTransient {
  readonly userId?: string | null;
  readonly campaignId?: string | null;
}

export const utmAttributionFactory = defineFactory<UtmAttributionOutput, UtmAttributionTransient>({
  name: 'user' as 'user',
  defaultTransient: {},

  build: ({ sequence, faker, transient }) => {
    const utmSource = faker.helpers.weightedArrayElement([
      { weight: 25, value: 'instagram' },
      { weight: 20, value: 'whatsapp' },
      { weight: 15, value: 'google' },
      { weight: 12, value: 'facebook' },
      { weight: 10, value: 'organic' },
      { weight: 8, value: 'referral' },
      { weight: 5, value: 'email' },
      { weight: 3, value: 'youtube' },
      { weight: 2, value: 'twitter' },
    ]);

    return {
      id: `utm-${String(sequence).padStart(12, '0')}`,
      userId: transient.userId ?? null,
      anonymousId: faker.string.uuid(),
      utmSource,
      utmMedium: faker.helpers.arrayElement([
        'cpc',
        'social',
        'email',
        'organic',
        'referral',
        'paid',
      ]),
      utmCampaign: `q1-2026-${utmSource}-acquisition`,
      utmContent: faker.helpers.maybe(() => 'banner-v2', { probability: 0.5 }) ?? null,
      utmTerm: faker.helpers.maybe(() => 'dental clinic near me', { probability: 0.4 }) ?? null,
      campaignId: transient.campaignId ?? null,
      landingPage: faker.helpers.arrayElement(['/', '/consultation', '/clinics', '/about']),
      referrer:
        faker.helpers.maybe(() => `https://${faker.internet.domainName()}`, { probability: 0.6 }) ??
        null,
      deviceType: faker.helpers.weightedArrayElement([
        { weight: 75, value: 'MOBILE' as const },
        { weight: 20, value: 'DESKTOP' as const },
        { weight: 5, value: 'TABLET' as const },
      ]),
      osName: faker.helpers.weightedArrayElement([
        { weight: 70, value: 'Android' },
        { weight: 20, value: 'iOS' },
        { weight: 8, value: 'Windows' },
        { weight: 2, value: 'macOS' },
      ]),
      browserName: faker.helpers.arrayElement([
        'Chrome',
        'Safari',
        'Firefox',
        'Edge',
        'WhatsApp Browser',
      ]),
      ipAddress: faker.internet.ipv4(),
      geoCity: faker.location.city(),
      attributionModel: faker.helpers.arrayElement([
        'FIRST_CLICK',
        'LAST_CLICK',
        'LINEAR',
        'POSITION_BASED',
      ] as const),
      touchpointSequence: faker.number.int({ min: 1, max: 8 }),
      conversionEvent:
        faker.helpers.maybe(
          () =>
            faker.helpers.arrayElement(['signup', 'consultation_started', 'appointment_booked']),
          { probability: 0.3 },
        ) ?? null,
      conversionValueInr: faker.number.int({ min: 0, max: 5000 }),
      capturedAt: faker.date.recent({ days: 90 }),
      createdAt: new Date(),
    };
  },

  persist: async (utm) => utm,
});
