import type { Consultation, ConsultationMessage, MessageRole } from '@prisma/client';
import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { consultationMessageFactory } from '../../factories/clinical/consultation-message.factory';
import { bulkInsert } from '../../factories/core/bulk-insert';

const BATCH_SIZE = 2000;

export const consultationMessagesModule = defineModule({
  name: 'clinical.consultation-messages',
  description: 'Per-consultation 8-25 turn message thread (~24K total)',
  category: 'clinical',
  version: '2.0.0',
  dependencies: ['clinical.consultations'],
  modelsTouched: ['consultationMessage'],
  factoriesUsed: ['consultation-message'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: {
    kind: 'COUNT_THRESHOLD',
    modelName: 'consultationMessage',
    threshold: 10000,
  },
  useTransaction: true,
  transactionTimeoutMs: 300_000,
  allowedEnvironments: ['development', 'test', 'staging'],
  checkpointEveryNBatches: 5,
  consumesRegistryKeys: [REGISTRY_KEYS.CONSULTATION_RECORDS],

  checkIdempotency: async (ctx) => (await ctx.prisma.consultationMessage.count()) >= 10000,

  run: async (ctx) =>
    measureExecution(consultationMessagesModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 500);
      const consultations = ctx.registry.getRequired<Consultation[]>(
        REGISTRY_KEYS.CONSULTATION_RECORDS,
      );

      const allMessages: ConsultationMessage[] = [];
      for (const c of consultations) {
        const turnCount = 8 + (c.id.charCodeAt(c.id.length - 1) % 18);
        for (let i = 0; i < turnCount; i++) {
          const role: MessageRole = i % 2 === 0 ? 'PATIENT' : 'AI';
          allMessages.push(
            consultationMessageFactory.build(undefined, {
              consultationId: c.id,
              turnIndex: i,
              role,
              locale: c.chiefComplaintLocale as
                | 'hindi'
                | 'english'
                | 'punjabi'
                | 'bengali'
                | 'tamil'
                | 'telugu'
                | 'marathi'
                | 'gujarati',
            }),
          );
        }
      }

      let created = 0;
      let checkpointsSaved = 0;
      await runInScope(consultationMessagesModule, ctx, async (tx) => {
        for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
          if (ctx.abortSignal.aborted) throw new Error('Aborted');
          const batch = allMessages.slice(i, i + BATCH_SIZE);
          const r = await bulkInsert(tx, 'consultationMessage', batch, {
            batchSize: BATCH_SIZE,
            skipDuplicates: true,
          });
          created += r.totalInserted;
          if (
            Math.floor(i / BATCH_SIZE) % consultationMessagesModule.checkpointEveryNBatches ===
            0
          ) {
            await ctx.saveCheckpoint(Math.floor(i / BATCH_SIZE), created);
            checkpointsSaved++;
          }
        }
      });

      ctx.logger.info(`✓ Consultation messages seeded`, { created, checkpointsSaved });

      return {
        recordsCreated: created,
        recordsSkipped: 0,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['consultation-message'],
        modelsTouched: ['consultationMessage'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved,
        metadata: { avgPerConsultation: consultations.length ? created / consultations.length : 0 },
      };
    }),
});
