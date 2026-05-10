// ═══════════════════════════════════════════════════════════════
// WHATSAPP MESSAGE FACTORY — Meta Cloud API message tracking
//
// SCHEMA-ALIGNED v2.0 — only fields that exist in `model WhatsAppMessage`.
// Earlier version had phantom fields (templateLanguage, templateVariables,
// failedAt, errorCode, errorReason, webhookEventsReceived) and missing
// REQUIRED `phoneNumber` field. Now strictly schema-compliant.
//
// 6 templates: consultation_complete, internal_alert, three_day_followup,
//              seven_day_followup, appointment_reminder, weekly_tip
// ═══════════════════════════════════════════════════════════════

import type {
  LocaleCode,
  WhatsAppDirection,
  WhatsAppMessage,
  WhatsAppProvider,
  WhatsAppStatus,
  WhatsAppTemplateCategory,
  WhatsAppTemplateName,
} from '@prisma/client';
import { defineFactory } from '../core';

interface WhatsAppMessageTransient {
  /** REQUIRED — schema's `phoneNumber` is non-nullable */
  readonly phoneNumber: string;
  /** Recipient phone (optional duplicate of phoneNumber) */
  readonly recipientPhone?: string;
  /** OPTIONAL — schema's userId is nullable but populate where possible */
  readonly userId?: string | null;
  readonly patientId?: string | null;
  readonly consultationId?: string | null;
  readonly appointmentId?: string | null;
  readonly templateName?: WhatsAppTemplateName | null;
  readonly templateNameLegacy?: string | null;
  readonly templateLocale?: LocaleCode;
  readonly forceStatus?: WhatsAppStatus;
  readonly relatedEntityType?: string | null;
  readonly relatedEntityId?: string | null;
}

export const whatsappMessageFactory = defineFactory<WhatsAppMessage, WhatsAppMessageTransient>({
  name: 'whatsapp-message',
  defaultTransient: {
    phoneNumber: '+919999900000',
  },

  build: ({ faker, transient }) => {
    if (!transient.phoneNumber) {
      throw new Error('[whatsapp-message.factory] phoneNumber required');
    }

    // Realistic Meta delivery distribution
    const status: WhatsAppStatus =
      transient.forceStatus ??
      faker.helpers.weightedArrayElement<WhatsAppStatus>([
        { weight: 60, value: 'DELIVERED' },
        { weight: 27, value: 'READ' },
        { weight: 8, value: 'SENT' },
        { weight: 3, value: 'FAILED' },
        { weight: 2, value: 'QUEUED' },
      ]);

    const direction: WhatsAppDirection = 'OUTBOUND';
    const provider: WhatsAppProvider = 'META';
    const templateLocale: LocaleCode = transient.templateLocale ?? 'hi';

    const sentAt = faker.date.recent({ days: 30 });

    // Template category — heuristic based on template name
    let templateCategory: WhatsAppTemplateCategory | null = null;
    if (transient.templateName) {
      const name = String(transient.templateName);
      if (name.includes('reminder') || name.includes('appointment')) {
        templateCategory = 'UTILITY';
      } else if (name.includes('tip') || name.includes('weekly')) {
        templateCategory = 'MARKETING';
      } else {
        templateCategory = 'UTILITY';
      }
    }

    return {
      id: faker.string.uuid(),
      userId: transient.userId ?? null,
      patientId: transient.patientId ?? null,
      consultationId: transient.consultationId ?? null,
      appointmentId: transient.appointmentId ?? null,

      // Strict template fields
      templateName: transient.templateName ?? null,
      templateNameLegacy: transient.templateNameLegacy ?? null,
      templateCategory,
      templateLocale,

      // Phone fields
      phoneNumber: transient.phoneNumber,
      recipientPhone: transient.recipientPhone ?? transient.phoneNumber,
      senderPhoneNumberId: '70184_64796', // Meta Cloud API sender (per memory rule)

      // Provider IDs
      waMessageId: `wamid.${faker.string.alphanumeric(40)}`,
      metaMessageId: `wamid.${faker.string.alphanumeric(40)}`,

      // Lifecycle
      status,
      statusUpdatedAt: sentAt,
      failureReason:
        status === 'FAILED'
          ? faker.helpers.arrayElement([
              'recipient-not-on-whatsapp',
              'rate-limit-exceeded',
              'template-not-approved',
              'invalid-phone-number',
            ])
          : null,
      direction,
      content: null,
      provider,

      // Per-message pricing
      costPaisa: status !== 'FAILED' ? faker.number.int({ min: 50, max: 350 }) : 0,
      pricingCategory: templateCategory ?? null,

      // Lifecycle timestamps
      sentAt,
      deliveredAt:
        status === 'DELIVERED' || status === 'READ'
          ? new Date(sentAt.getTime() + faker.number.int({ min: 1000, max: 30000 }))
          : null,
      readAt:
        status === 'READ'
          ? new Date(sentAt.getTime() + faker.number.int({ min: 5000, max: 3600000 }))
          : null,
      scheduledFor: null,

      // Generic relation
      relatedEntityType: transient.relatedEntityType ?? null,
      relatedEntityId: transient.relatedEntityId ?? null,

      // Timestamps (schema defaults but explicit)
      createdAt: sentAt,
      updatedAt: new Date(),
    } as unknown as WhatsAppMessage;
  },

  persist: async (msg, prisma) => {
    return prisma.whatsAppMessage.upsert({
      where: { id: (msg as { id: string }).id },
      create: msg as never,
      update: { updatedAt: new Date() },
    });
  },
});
