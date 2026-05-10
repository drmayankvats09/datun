// ═══════════════════════════════════════════════════════════════
// INTEGRATION TOKEN FACTORY — OAuth tokens (Google Cal, Razorpay, Zoho)
// Encrypted at rest; tokens stored only as ciphertext fingerprint here
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type Provider =
  | 'GOOGLE_CALENDAR'
  | 'GOOGLE_MEET'
  | 'RAZORPAY'
  | 'ZOHO_BOOKS'
  | 'TALLY'
  | 'WHATSAPP_BUSINESS'
  | 'META_ADS'
  | 'SHOPIFY'
  | 'STRIPE';

interface IntegrationTokenOutput {
  readonly id: string;
  readonly clinicId: string;
  readonly provider: Provider;
  readonly providerAccountId: string;
  readonly providerAccountEmail: string | null;
  readonly accessTokenCiphertextFingerprint: string;
  readonly refreshTokenCiphertextFingerprint: string | null;
  readonly tokenType: 'BEARER' | 'API_KEY' | 'OAUTH2';
  readonly scopes: readonly string[];
  readonly issuedAt: Date;
  readonly expiresAt: Date | null;
  readonly lastRefreshedAt: Date | null;
  readonly refreshCount: number;
  readonly status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'INVALID' | 'NEEDS_REAUTH';
  readonly lastUsedAt: Date | null;
  readonly lastErrorMessage: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface IntegrationTokenTransient {
  readonly clinicId: string;
  readonly provider: Provider;
}

const SCOPES_BY_PROVIDER: Record<Provider, string[]> = {
  GOOGLE_CALENDAR: [
    'calendar.events.readonly',
    'calendar.events.create',
    'calendar.calendarlist.readonly',
  ],
  GOOGLE_MEET: ['meetings.create'],
  RAZORPAY: ['payments.read', 'payments.create', 'subscriptions.manage'],
  ZOHO_BOOKS: ['books.invoices.READ', 'books.invoices.CREATE'],
  TALLY: ['vouchers.read', 'masters.create'],
  WHATSAPP_BUSINESS: ['whatsapp_business_management', 'whatsapp_business_messaging'],
  META_ADS: ['ads_management', 'ads_read'],
  SHOPIFY: ['read_orders', 'write_orders'],
  STRIPE: ['payments:read', 'payments:write'],
};

export const integrationTokenFactory = defineFactory<
  IntegrationTokenOutput,
  IntegrationTokenTransient
>({
  name: 'clinic' as 'clinic',
  defaultTransient: { clinicId: 'unknown', provider: 'GOOGLE_CALENDAR' },

  build: ({ sequence, faker, transient }) => {
    const status = faker.helpers.weightedArrayElement([
      { weight: 80, value: 'ACTIVE' as const },
      { weight: 8, value: 'EXPIRED' as const },
      { weight: 5, value: 'NEEDS_REAUTH' as const },
      { weight: 4, value: 'REVOKED' as const },
      { weight: 3, value: 'INVALID' as const },
    ]);

    const issuedAt = faker.date.past({ years: 1 });
    const expiresAt = transient.provider.startsWith('GOOGLE')
      ? new Date(issuedAt.getTime() + 3600 * 1000)
      : null;

    return {
      id: `intok-${String(sequence).padStart(10, '0')}`,
      clinicId: transient.clinicId,
      provider: transient.provider,
      providerAccountId: faker.string.alphanumeric(20),
      providerAccountEmail:
        faker.helpers.maybe(() => faker.internet.email(), { probability: 0.7 }) ?? null,
      accessTokenCiphertextFingerprint: `sha256:${faker.string.alphanumeric(16)}`,
      refreshTokenCiphertextFingerprint:
        faker.helpers.maybe(() => `sha256:${faker.string.alphanumeric(16)}`, {
          probability: 0.6,
        }) ?? null,
      tokenType: faker.helpers.arrayElement(['BEARER', 'API_KEY', 'OAUTH2'] as const),
      scopes: SCOPES_BY_PROVIDER[transient.provider],
      issuedAt,
      expiresAt,
      lastRefreshedAt:
        faker.helpers.maybe(() => faker.date.recent({ days: 7 }), { probability: 0.6 }) ?? null,
      refreshCount: faker.number.int({ min: 0, max: 100 }),
      status,
      lastUsedAt: status === 'ACTIVE' ? faker.date.recent({ days: 1 }) : null,
      lastErrorMessage: status === 'INVALID' ? 'Token signature verification failed' : null,
      createdAt: issuedAt,
      updatedAt: new Date(),
    };
  },

  persist: async (token) => token,
});
