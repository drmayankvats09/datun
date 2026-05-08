// ═══════════════════════════════════════════════════════════════
// WEBHOOK DELIVERY FACTORY — Outbound webhooks to clinic systems (HIS)
// Source: Stripe webhook delivery patterns + retry policies
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type WebhookEvent =
  | 'consultation.completed'
  | 'consultation.escalated'
  | 'appointment.created'
  | 'appointment.cancelled'
  | 'prescription.issued'
  | 'patient.registered'
  | 'payment.captured'
  | 'subscription.renewed';

interface WebhookDeliveryOutput {
  readonly id: string;
  readonly clinicId: string;
  readonly webhookUrl: string;
  readonly event: WebhookEvent;
  readonly entityType: string;
  readonly entityId: string;
  readonly payload: object;
  readonly httpStatus: number | null;
  readonly responseBody: string | null;
  readonly responseTimeMs: number | null;
  readonly status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRY' | 'EXHAUSTED';
  readonly attemptNumber: number;
  readonly maxAttempts: number;
  readonly nextRetryAt: Date | null;
  readonly attemptedAt: Date;
  readonly succeededAt: Date | null;
  readonly failedAt: Date | null;
  readonly errorMessage: string | null;
  readonly signatureHeader: string;
  readonly idempotencyKey: string;
  readonly createdAt: Date;
}

interface WebhookDeliveryTransient {
  readonly clinicId: string;
  readonly event?: WebhookEvent;
}

export const webhookDeliveryFactory = defineFactory<
  WebhookDeliveryOutput,
  WebhookDeliveryTransient
>({
  name: 'clinic' as 'clinic',
  defaultTransient: { clinicId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const event =
      transient.event ??
      faker.helpers.arrayElement([
        'consultation.completed',
        'appointment.created',
        'patient.registered',
        'payment.captured',
      ] as const);

    const status = faker.helpers.weightedArrayElement([
      { weight: 78, value: 'SUCCESS' as const },
      { weight: 8, value: 'RETRY' as const },
      { weight: 6, value: 'FAILED' as const },
      { weight: 5, value: 'EXHAUSTED' as const },
      { weight: 3, value: 'PENDING' as const },
    ]);

    const httpStatus =
      status === 'SUCCESS'
        ? faker.helpers.arrayElement([200, 201, 204])
        : status === 'FAILED' || status === 'EXHAUSTED'
          ? faker.helpers.arrayElement([400, 401, 403, 404, 500, 502, 503, 504])
          : null;

    const attemptedAt = faker.date.recent({ days: 30 });

    return {
      id: `webhook-${String(sequence).padStart(12, '0')}`,
      clinicId: transient.clinicId,
      webhookUrl: `https://${faker.internet.domainName()}/datun/webhook`,
      event,
      entityType: event.split('.')[0]!,
      entityId: `${event.split('.')[0]}-${faker.string.alphanumeric(10)}`,
      payload: { event, timestamp: attemptedAt.toISOString() },
      httpStatus,
      responseBody: status === 'SUCCESS' ? '{"received":true}' : null,
      responseTimeMs: httpStatus ? faker.number.int({ min: 50, max: 5000 }) : null,
      status,
      attemptNumber:
        status === 'EXHAUSTED' ? 5 : status === 'RETRY' ? faker.number.int({ min: 2, max: 4 }) : 1,
      maxAttempts: 5,
      nextRetryAt: status === 'RETRY' ? faker.date.soon({ days: 1 }) : null,
      attemptedAt,
      succeededAt: status === 'SUCCESS' ? attemptedAt : null,
      failedAt: status === 'FAILED' || status === 'EXHAUSTED' ? attemptedAt : null,
      errorMessage: status === 'FAILED' || status === 'EXHAUSTED' ? 'Connection timeout' : null,
      signatureHeader: `sha256=${faker.string.alphanumeric(64)}`,
      idempotencyKey: faker.string.uuid(),
      createdAt: attemptedAt,
    };
  },

  persist: async (webhook) => webhook,
});
