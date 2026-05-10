// ═══════════════════════════════════════════════════════════════
// CONSULTATION MESSAGE FACTORY — Individual chat messages within consultation
//
// SCHEMA-ALIGNED v2.0 — only fields that exist in `model ConsultationMessage`:
//   id, consultationId, role, content, contentType, imageUrl, chips,
//   selectedChip, aiLatencyMs, aiTokensUsed, sequenceNumber, createdAt
//
// Each consultation typically has 8-25 messages.
// ═══════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto';
import type { ConsultationMessage, LocaleCode, MessageRole } from '@prisma/client';
import { defineFactory } from '../core';
import { resolveLocale } from '../../data/linguistic/locales';

interface ConsultationMessageTransient {
  readonly consultationId: string;
  /** Sequence number within the conversation (0-indexed) */
  readonly turnIndex: number;
  /** PATIENT | AI | DOCTOR | SYSTEM | USER | ASSISTANT */
  readonly role: MessageRole;
  /** 2-letter locale code (en, hi, pa, etc.) */
  readonly locale?: LocaleCode;
  readonly textOverride?: string;
}

const VALID_LOCALE_CODES: ReadonlyArray<LocaleCode> = [
  'en',
  'hi',
  'pa',
  'bn',
  'ta',
  'te',
  'mr',
  'gu',
  'kn',
  'ml',
  'or',
  'as',
];

function safeLocale(input: string | undefined): LocaleCode {
  if (input && VALID_LOCALE_CODES.includes(input as LocaleCode)) {
    return input as LocaleCode;
  }
  return 'hi';
}

export const consultationMessageFactory = defineFactory<
  ConsultationMessage,
  ConsultationMessageTransient
>({
  name: 'consultation-message',
  defaultTransient: { consultationId: '', turnIndex: 0, role: 'PATIENT' },

  build: ({ faker, transient }) => {
    if (!transient.consultationId) {
      throw new Error('[consultation-message.factory] consultationId required');
    }

    const localeCode = safeLocale(transient.locale);
    const localeBundle = resolveLocale(localeCode);

    // Pick text based on role + turn
    let text: string;
    if (transient.textOverride) {
      text = transient.textOverride;
    } else if (transient.role === 'PATIENT' || transient.role === 'USER') {
      text =
        transient.turnIndex === 0
          ? faker.helpers.arrayElement(localeBundle.patientOpeners)
          : faker.helpers.arrayElement(localeBundle.followUpQuestions);
    } else if (transient.role === 'AI' || transient.role === 'ASSISTANT') {
      text = faker.helpers.arrayElement(localeBundle.aiAcknowledgements);
    } else {
      text = '[system event]';
    }

    const isAi = transient.role === 'AI' || transient.role === 'ASSISTANT';

    return {
      id: randomUUID(),
      consultationId: transient.consultationId,
      role: transient.role,
      content: text,
      contentType: 'TEXT',
      imageUrl: null,
      chips: null,
      selectedChip: null,

      // AI telemetry (null for non-AI messages)
      aiLatencyMs: isAi ? faker.number.int({ min: 600, max: 6000 }) : null,
      aiTokensUsed: isAi ? faker.number.int({ min: 150, max: 2100 }) : null,

      // Schema requires sequenceNumber
      sequenceNumber: transient.turnIndex,

      createdAt: faker.date.recent({ days: 90 }),
    } as unknown as ConsultationMessage;
  },

  persist: async (msg, prisma) => {
    const m = msg as Record<string, unknown>;
    return prisma.consultationMessage.upsert({
      where: { id: m.id as string },
      create: m as never,
      update: {}, // append-only — never overwritten
    }) as unknown as ConsultationMessage;
  },
});
