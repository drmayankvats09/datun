// ═══════════════════════════════════════════════════════════════
// WHATSAPP MESSAGE FACTORY — Meta Cloud API message tracking
// 6 templates: consultation_complete, internal_alert, 3day_followup,
//              7day_followup, appointment_reminder, weekly_tip
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient, WhatsAppMessage, WhatsAppStatus } from '@prisma/client';
import { defineFactory } from '../core';
import { WHATSAPP_TEMPLATES, type WhatsAppTemplateName } from '../../data/whatsapp-templates';

interface WhatsAppMessageTransient {
  readonly recipientPhone: string;
  readonly templateName: WhatsAppTemplateName;
  readonly patientId?: string | null;
  readonly consultationId?: string | null;
  readonly appointmentId?: string | null;
  readonly forceStatus?: WhatsAppStatus;
}

export const whatsappMessageFactory = defineFactory<WhatsAppMessage, WhatsAppMessageTransient>({
  name: 'whatsapp-message',
  defaultTransient: {
    recipientPhone: '+919999900000',
    templateName: 'consultation_complete',
  },

  build: ({ sequence, faker, transient }) => {
    const template = WHATSAPP_TEMPLATES.find((t) => t.name === transient.templateName);

    // Realistic Meta delivery distribution: 87% delivered, 8% read, 3% failed, 2% pending
    const status: WhatsAppStatus =
      transient.forceStatus ??
      faker.helpers.weightedArrayElement([
        { weight: 60, value: 'DELIVERED' },
        { weight: 27, value: 'READ' },
        { weight: 8, value: 'SENT' },
        { weight: 3, value: 'FAILED' },
        { weight: 2, value: 'PENDING' },
      ]);

    const sentAt = faker.date.recent({ days: 30 });

    return {
      id: `wam-${String(sequence).padStart(10, '0')}`,
      patientId: transient.patientId ?? null,
      consultationId: transient.consultationId ?? null,
      appointmentId: transient.appointmentId ?? null,

      // Meta Cloud API
      metaMessageId: `wamid.${faker.string.alphanumeric(40)}`,
      recipientPhone: transient.recipientPhone,
      senderPhoneNumberId: faker.helpers.arrayElement([
        '70184_64796', // Meta Cloud API sender (per memory rule 4)
      ]),

      // Template
      templateName: transient.templateName,
      // Cast template to broaden access — template meta is loaded from JSON
      // and may have language/exampleVariables that aren't in the strict type.
      templateLanguage:
        (template as unknown as { language?: string } | undefined)?.language ?? 'hi',
      templateVariables: JSON.stringify(
        (template as unknown as { exampleVariables?: unknown[] } | undefined)?.exampleVariables ??
          [],
      ),

      // Lifecycle (Meta event flow: sent → delivered → read or failed)
      status,
      sentAt,
      deliveredAt:
        status !== 'PENDING' && status !== 'FAILED'
          ? new Date(sentAt.getTime() + faker.number.int({ min: 1000, max: 30000 }))
          : null,
      readAt:
        status === 'READ'
          ? new Date(sentAt.getTime() + faker.number.int({ min: 5000, max: 3600000 }))
          : null,
      failedAt: status === 'FAILED' ? sentAt : null,

      // Failure metadata
      errorCode:
        status === 'FAILED' ? faker.helpers.arrayElement(['131026', '131047', '131056']) : null,
      errorReason:
        status === 'FAILED'
          ? faker.helpers.arrayElement([
              'recipient-not-on-whatsapp',
              'rate-limit-exceeded',
              'template-not-approved',
            ])
          : null,

      // Webhook trail (audit)
      webhookEventsReceived: JSON.stringify(['sent', 'delivered']),

      createdAt: sentAt,
      updatedAt: new Date(),
    } as unknown as WhatsAppMessage;
  },

  persist: async (msg, prisma) => {
    return prisma.whatsAppMessage.upsert({
      where: { id: msg.id },
      create: msg,
      update: { updatedAt: new Date() },
    });
  },
});
