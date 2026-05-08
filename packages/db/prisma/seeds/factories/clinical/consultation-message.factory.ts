// ═══════════════════════════════════════════════════════════════
// CONSULTATION MESSAGE FACTORY — Individual chat messages within consultation
// Reproduces realistic AI ↔ Patient back-and-forth turns.
// Each consultation typically has 8-25 messages.
// ═══════════════════════════════════════════════════════════════

import type { ConsultationMessage, MessageRole, Prisma, PrismaClient } from '@prisma/client';
import { defineFactory, prismaInput } from '../core';
import { resolveLocale } from '../../data/linguistic/locales';

interface ConsultationMessageTransient {
  readonly consultationId: string;
  readonly turnIndex: number;
  readonly role: MessageRole; // PATIENT | AI | DOCTOR | SYSTEM
  readonly locale?:
    | 'hindi'
    | 'english'
    | 'punjabi'
    | 'bengali'
    | 'tamil'
    | 'telugu'
    | 'marathi'
    | 'gujarati';
  readonly textOverride?: string;
}

export const consultationMessageFactory = defineFactory<
  ConsultationMessage,
  ConsultationMessageTransient
>({
  name: 'consultation-message',
  defaultTransient: { consultationId: '', turnIndex: 0, role: 'PATIENT' },

  build: ({ sequence, faker, transient }) => {
    if (!transient.consultationId) {
      throw new Error('[consultation-message.factory] consultationId required');
    }

    const locale = transient.locale ?? 'hindi';
    const localeBundle = resolveLocale(locale);

    // Pick text based on role + turn
    let text: string;
    if (transient.textOverride) {
      text = transient.textOverride;
    } else if (transient.role === 'PATIENT') {
      text =
        transient.turnIndex === 0
          ? faker.helpers.arrayElement(localeBundle.patientOpeners)
          : faker.helpers.arrayElement(localeBundle.followUpQuestions);
    } else if (transient.role === 'AI') {
      text = faker.helpers.arrayElement(localeBundle.aiAcknowledgements);
    } else {
      text = '[system event]';
    }

    return {
      id: `msg-${String(sequence).padStart(10, '0')}`,
      consultationId: transient.consultationId,
      turnIndex: transient.turnIndex,
      role: transient.role,
      content: text,
      contentLocale: locale,
      attachmentUrls: JSON.stringify([]),

      // AI-specific
      aiModelUsed: transient.role === 'AI' ? 'claude-sonnet-4' : null,
      aiInputTokens: transient.role === 'AI' ? faker.number.int({ min: 100, max: 1500 }) : null,
      aiOutputTokens: transient.role === 'AI' ? faker.number.int({ min: 50, max: 600 }) : null,
      aiLatencyMs: transient.role === 'AI' ? faker.number.int({ min: 600, max: 6000 }) : null,

      // Lifecycle
      sentAt: faker.date.recent({ days: 90 }),
      readAt:
        faker.helpers.maybe(() => faker.date.recent({ days: 1 }), { probability: 0.7 }) ?? null,
      isEdited: false,
      editedAt: null,

      createdAt: faker.date.recent({ days: 90 }),
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as ConsultationMessage;
  },

  persist: async (msg, prisma) => {
    const m = msg as Record<string, unknown>;
    return prisma.consultationMessage.upsert({
      where: { id: m.id as string },
      create: prismaInput<Prisma.ConsultationMessageUncheckedCreateInput>(m),
      update: {}, // ConsultationMessage is append-only — never overwritten
    }) as unknown as ConsultationMessage;
  },
});
