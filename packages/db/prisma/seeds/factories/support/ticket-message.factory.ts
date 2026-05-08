// ═══════════════════════════════════════════════════════════════
// TICKET MESSAGE FACTORY — Conversation thread within ticket
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface TicketMessageOutput {
  readonly id: string;
  readonly ticketId: string;
  readonly senderUserId: string;
  readonly senderRole: 'CUSTOMER' | 'AGENT' | 'AI_AGENT' | 'SYSTEM';
  readonly content: string;
  readonly contentLocale: 'hindi' | 'english';
  readonly attachmentUrls: readonly string[];
  readonly isInternalNote: boolean;
  readonly readByCustomer: boolean;
  readonly readByAgent: boolean;
  readonly aiSentimentLabel:
    | 'POSITIVE'
    | 'NEUTRAL'
    | 'NEGATIVE'
    | 'FRUSTRATED'
    | 'SATISFIED'
    | null;
  readonly aiSentimentScore: number | null;
  readonly sentAt: Date;
  readonly createdAt: Date;
}

interface TicketMessageTransient {
  readonly ticketId: string;
  readonly senderUserId: string;
  readonly senderRole: 'CUSTOMER' | 'AGENT' | 'AI_AGENT' | 'SYSTEM';
}

export const ticketMessageFactory = defineFactory<TicketMessageOutput, TicketMessageTransient>({
  name: 'user' as 'user',
  defaultTransient: { ticketId: 'unknown', senderUserId: 'unknown', senderRole: 'CUSTOMER' },

  build: ({ sequence, faker, transient }) => {
    return {
      id: `tmsg-${String(sequence).padStart(12, '0')}`,
      ticketId: transient.ticketId,
      senderUserId: transient.senderUserId,
      senderRole: transient.senderRole,
      content: faker.lorem.sentence(),
      contentLocale: faker.helpers.arrayElement(['hindi', 'english'] as const),
      attachmentUrls:
        faker.helpers.maybe(() => [`https://r2.datunai.com/tickets/msg-${sequence}.png`], {
          probability: 0.15,
        }) ?? [],
      isInternalNote:
        transient.senderRole === 'AGENT' && faker.datatype.boolean({ probability: 0.2 }),
      readByCustomer:
        transient.senderRole !== 'CUSTOMER' && faker.datatype.boolean({ probability: 0.7 }),
      readByAgent:
        transient.senderRole === 'CUSTOMER' && faker.datatype.boolean({ probability: 0.95 }),
      aiSentimentLabel:
        transient.senderRole === 'CUSTOMER'
          ? faker.helpers.arrayElement(['NEUTRAL', 'NEGATIVE', 'FRUSTRATED', 'SATISFIED'] as const)
          : null,
      aiSentimentScore:
        transient.senderRole === 'CUSTOMER' ? faker.number.float({ min: -1, max: 1 }) : null,
      sentAt: faker.date.recent({ days: 30 }),
      createdAt: new Date(),
    };
  },

  persist: async (msg) => msg,
});
