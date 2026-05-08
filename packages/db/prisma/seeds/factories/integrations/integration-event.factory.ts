// ═══════════════════════════════════════════════════════════════
// INTEGRATION EVENT FACTORY — Inbound events from third parties
// e.g., Razorpay charge succeeded, Google Calendar event updated
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface IntegrationEventOutput {
  readonly id: string;
  readonly clinicId: string | null;
  readonly provider: string;
  readonly providerEventId: string;
  readonly eventType: string;
  readonly eventVersion: string;
  readonly payload: object;
  readonly signatureValid: boolean;
  readonly receivedAt: Date;
  readonly processedAt: Date | null;
  readonly processingDurationMs: number | null;
  readonly status: 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'IGNORED' | 'DUPLICATE';
  readonly internalEntityType: string | null;
  readonly internalEntityId: string | null;
  readonly errorMessage: string | null;
  readonly retryCount: number;
  readonly createdAt: Date;
}

interface IntegrationEventTransient {
  readonly clinicId?: string | null;
  readonly provider?: string;
}

export const integrationEventFactory = defineFactory<
  IntegrationEventOutput,
  IntegrationEventTransient
>({
  name: 'clinic' as 'clinic',
  defaultTransient: {},

  build: ({ sequence, faker, transient }) => {
    const provider =
      transient.provider ??
      faker.helpers.arrayElement(['RAZORPAY', 'GOOGLE_CALENDAR', 'WHATSAPP_BUSINESS', 'STRIPE']);
    const eventType =
      provider === 'RAZORPAY'
        ? faker.helpers.arrayElement(['payment.captured', 'payment.failed', 'subscription.charged'])
        : provider === 'GOOGLE_CALENDAR'
          ? faker.helpers.arrayElement(['event.created', 'event.updated', 'event.cancelled'])
          : provider === 'WHATSAPP_BUSINESS'
            ? faker.helpers.arrayElement(['message.received', 'status.delivered', 'status.read'])
            : 'unknown.event';

    const status = faker.helpers.weightedArrayElement([
      { weight: 80, value: 'PROCESSED' as const },
      { weight: 8, value: 'PROCESSING' as const },
      { weight: 5, value: 'RECEIVED' as const },
      { weight: 3, value: 'FAILED' as const },
      { weight: 2, value: 'IGNORED' as const },
      { weight: 2, value: 'DUPLICATE' as const },
    ]);

    const receivedAt = faker.date.recent({ days: 30 });
    const processedAt =
      status === 'PROCESSED' || status === 'FAILED'
        ? new Date(receivedAt.getTime() + faker.number.int({ min: 100, max: 30000 }))
        : null;

    return {
      id: `intevt-${String(sequence).padStart(12, '0')}`,
      clinicId: transient.clinicId ?? null,
      provider,
      providerEventId: `${provider.toLowerCase()}_${faker.string.alphanumeric(20)}`,
      eventType,
      eventVersion: 'v1',
      payload: { event: eventType, timestamp: receivedAt.toISOString() },
      signatureValid: faker.datatype.boolean({ probability: 0.98 }),
      receivedAt,
      processedAt,
      processingDurationMs: processedAt ? processedAt.getTime() - receivedAt.getTime() : null,
      status,
      internalEntityType: status === 'PROCESSED' ? (eventType.split('.')[0] ?? null) : null,
      internalEntityId: status === 'PROCESSED' ? `entity-${faker.string.alphanumeric(10)}` : null,
      errorMessage: status === 'FAILED' ? 'Webhook signature mismatch' : null,
      retryCount: status === 'FAILED' ? faker.number.int({ min: 1, max: 3 }) : 0,
      createdAt: receivedAt,
    };
  },

  persist: async (event) => event,
});
