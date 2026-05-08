// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION EVENT FACTORY — Stripe-style billing event trail
// Source: Stripe Subscriptions API event types
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type EventType =
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_UPDATED'
  | 'SUBSCRIPTION_CANCELED'
  | 'SUBSCRIPTION_PAUSED'
  | 'SUBSCRIPTION_RESUMED'
  | 'SUBSCRIPTION_RENEWED'
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID'
  | 'INVOICE_PAYMENT_FAILED'
  | 'INVOICE_PAYMENT_RETRY'
  | 'TRIAL_STARTED'
  | 'TRIAL_ENDED'
  | 'TRIAL_CONVERTED'
  | 'PLAN_UPGRADED'
  | 'PLAN_DOWNGRADED'
  | 'PROMO_CODE_APPLIED'
  | 'GRACE_PERIOD_STARTED'
  | 'GRACE_PERIOD_ENDED'
  | 'CHURN_DETECTED'
  | 'WIN_BACK_OFFER_SENT';

interface SubscriptionEventOutput {
  readonly id: string;
  readonly clinicId: string;
  readonly subscriptionId: string;
  readonly eventType: EventType;
  readonly previousTier: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE' | null;
  readonly newTier: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE' | null;
  readonly previousMrrInr: number;
  readonly newMrrInr: number;
  readonly mrrChangeInr: number;
  readonly invoiceId: string | null;
  readonly amountInr: number;
  readonly billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  readonly nextBillingDate: Date | null;
  readonly initiatedBy: 'CLINIC' | 'DATUN_TEAM' | 'SYSTEM_AUTO' | 'PAYMENT_PROVIDER';
  readonly metadata: object;
  readonly stripeEventId: string | null;
  readonly occurredAt: Date;
  readonly createdAt: Date;
}

interface SubscriptionEventTransient {
  readonly clinicId: string;
  readonly subscriptionId: string;
  readonly forceEventType?: EventType;
}

const TIER_PRICING_INR = { TRIAL: 0, STARTER: 999, PRO: 1999, ENTERPRISE: 9999 };

export const subscriptionEventFactory = defineFactory<
  SubscriptionEventOutput,
  SubscriptionEventTransient
>({
  name: 'clinic' as 'clinic',
  defaultTransient: { clinicId: 'unknown', subscriptionId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const eventType =
      transient.forceEventType ??
      faker.helpers.weightedArrayElement([
        { weight: 18, value: 'INVOICE_PAID' as const },
        { weight: 12, value: 'SUBSCRIPTION_RENEWED' as const },
        { weight: 10, value: 'INVOICE_CREATED' as const },
        { weight: 8, value: 'TRIAL_STARTED' as const },
        { weight: 6, value: 'TRIAL_CONVERTED' as const },
        { weight: 5, value: 'TRIAL_ENDED' as const },
        { weight: 5, value: 'SUBSCRIPTION_CREATED' as const },
        { weight: 5, value: 'PLAN_UPGRADED' as const },
        { weight: 4, value: 'INVOICE_PAYMENT_FAILED' as const },
        { weight: 4, value: 'SUBSCRIPTION_UPDATED' as const },
        { weight: 4, value: 'PROMO_CODE_APPLIED' as const },
        { weight: 4, value: 'INVOICE_PAYMENT_RETRY' as const },
        { weight: 3, value: 'PLAN_DOWNGRADED' as const },
        { weight: 3, value: 'SUBSCRIPTION_CANCELED' as const },
        { weight: 3, value: 'GRACE_PERIOD_STARTED' as const },
        { weight: 2, value: 'CHURN_DETECTED' as const },
        { weight: 2, value: 'WIN_BACK_OFFER_SENT' as const },
        { weight: 1, value: 'SUBSCRIPTION_PAUSED' as const },
        { weight: 1, value: 'GRACE_PERIOD_ENDED' as const },
      ]);

    const previousTier = ['PLAN_UPGRADED', 'PLAN_DOWNGRADED', 'TRIAL_CONVERTED'].includes(eventType)
      ? faker.helpers.arrayElement(['TRIAL', 'STARTER', 'PRO'] as const)
      : null;
    const newTier = faker.helpers.arrayElement(['STARTER', 'PRO', 'ENTERPRISE'] as const);
    const previousMrr = previousTier ? TIER_PRICING_INR[previousTier] : 0;
    const newMrr = TIER_PRICING_INR[newTier];

    return {
      id: `subevt-${String(sequence).padStart(12, '0')}`,
      clinicId: transient.clinicId,
      subscriptionId: transient.subscriptionId,
      eventType,
      previousTier,
      newTier: ['SUBSCRIPTION_CANCELED', 'CHURN_DETECTED'].includes(eventType) ? null : newTier,
      previousMrrInr: previousMrr,
      newMrrInr: newMrr,
      mrrChangeInr: newMrr - previousMrr,
      invoiceId: [
        'INVOICE_CREATED',
        'INVOICE_PAID',
        'INVOICE_PAYMENT_FAILED',
        'INVOICE_PAYMENT_RETRY',
      ].includes(eventType)
        ? `inv-${faker.string.alphanumeric(10)}`
        : null,
      amountInr: newMrr,
      billingCycle: faker.helpers.weightedArrayElement([
        { weight: 70, value: 'MONTHLY' as const },
        { weight: 20, value: 'QUARTERLY' as const },
        { weight: 10, value: 'ANNUAL' as const },
      ]),
      nextBillingDate: faker.date.soon({ days: 30 }),
      initiatedBy: faker.helpers.weightedArrayElement([
        { weight: 50, value: 'CLINIC' as const },
        { weight: 30, value: 'SYSTEM_AUTO' as const },
        { weight: 15, value: 'PAYMENT_PROVIDER' as const },
        { weight: 5, value: 'DATUN_TEAM' as const },
      ]),
      metadata: {},
      stripeEventId:
        faker.helpers.maybe(() => `evt_${faker.string.alphanumeric(24)}`, { probability: 0.6 }) ??
        null,
      occurredAt: faker.date.recent({ days: 365 }),
      createdAt: new Date(),
    };
  },

  persist: async (event) => event,
});
