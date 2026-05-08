// ═══════════════════════════════════════════════════════════════
// SUPPORT TICKETS + MESSAGES + KB ARTICLES
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { supportTicketFactory } from '../../factories/support/ticket.factory';
import { ticketMessageFactory } from '../../factories/support/ticket-message.factory';
import { kbArticleFactory } from '../../factories/support/kb-article.factory';

const KB_COUNT = 100;

export const ticketsModule = defineModule({
  name: 'support.tickets',
  description: 'Support tickets from patients + clinics (~3% conversion rate)',
  category: 'support',
  version: '2.0.0',
  dependencies: ['identity.patient-users'],
  modelsTouched: ['supportTicket'],
  factoriesUsed: ['supportTicket'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.PATIENT_USER_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.TICKET_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(ticketsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2200);
      const userIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PATIENT_USER_IDS);
      const ticketCount = Math.floor(userIds.length * 0.03);
      const ticketIds: string[] = [];

      await runInScope(ticketsModule, ctx, async () => {
        for (let i = 0; i < ticketCount; i++) {
          const t = supportTicketFactory.build(undefined, { raisedByUserId: userIds[i]! });
          ticketIds.push(t.id);
        }
      });

      ctx.registry.set(REGISTRY_KEYS.TICKET_IDS, ticketIds);
      return {
        recordsCreated: 0,
        recordsSkipped: ticketIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['supportTicket'],
        modelsTouched: ['supportTicket'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const ticketMessagesModule = defineModule({
  name: 'support.ticket-messages',
  description: 'Conversation thread per ticket (3-12 messages)',
  category: 'support',
  version: '2.0.0',
  dependencies: ['support.tickets'],
  modelsTouched: ['ticketMessage'],
  factoriesUsed: ['ticketMessage'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.TICKET_IDS, REGISTRY_KEYS.PATIENT_USER_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.TICKET_MESSAGE_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(ticketMessagesModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2230);
      const ticketIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.TICKET_IDS);
      const userIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PATIENT_USER_IDS);
      const messageIds: string[] = [];

      await runInScope(ticketMessagesModule, ctx, async () => {
        for (const ticketId of ticketIds) {
          const msgCount = 3 + (ticketId.charCodeAt(ticketId.length - 1) % 9);
          for (let i = 0; i < msgCount; i++) {
            const m = ticketMessageFactory.build(undefined, {
              ticketId,
              senderUserId: i % 2 === 0 ? userIds[i % userIds.length]! : 'admin-1',
              senderRole: i % 2 === 0 ? 'CUSTOMER' : 'AGENT',
            });
            messageIds.push(m.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.TICKET_MESSAGE_IDS, messageIds);
      return {
        recordsCreated: 0,
        recordsSkipped: messageIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['ticketMessage'],
        modelsTouched: ['ticketMessage'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const kbArticlesModule = defineModule({
  name: 'support.kb-articles',
  description: '100 self-serve help articles',
  category: 'support',
  version: '2.0.0',
  dependencies: [],
  modelsTouched: ['kbArticle'],
  factoriesUsed: ['kbArticle'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  providesRegistryKeys: [REGISTRY_KEYS.KB_ARTICLE_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(kbArticlesModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 2280);
      const articles = kbArticleFactory.buildList(KB_COUNT);

      await runInScope(kbArticlesModule, ctx, async () => {
        /* schema may not support */
      });
      ctx.registry.set(
        REGISTRY_KEYS.KB_ARTICLE_IDS,
        articles.map((a) => a.id),
      );

      return {
        recordsCreated: 0,
        recordsSkipped: articles.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['kbArticle'],
        modelsTouched: ['kbArticle'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
