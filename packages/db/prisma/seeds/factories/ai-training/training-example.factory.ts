// ═══════════════════════════════════════════════════════════════
// TRAINING EXAMPLE FACTORY — Curated AI fine-tune dataset entries
// Format: OpenAI/Anthropic JSONL with messages array.
// Used to export training datasets for future Datun-specific AI.
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient, TrainingExample } from '@prisma/client';
import { defineFactory } from '../core';
import { ACTIVE_PROMPT_VERSION } from '../../data/system-prompts';

interface TrainingExampleTransient {
  readonly consultationId: string;
  readonly trainingLabelId: string;
  readonly messages: ReadonlyArray<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  readonly forceStatus?: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'EXPORTED';
}

export const trainingExampleFactory = defineFactory<TrainingExample, TrainingExampleTransient>({
  name: 'training-example',
  defaultTransient: { consultationId: '', trainingLabelId: '', messages: [] },

  build: ({ sequence, faker, transient }) => {
    const status =
      transient.forceStatus ??
      faker.helpers.weightedArrayElement([
        { weight: 50, value: 'APPROVED' },
        { weight: 30, value: 'DRAFT' },
        { weight: 15, value: 'EXPORTED' },
        { weight: 5, value: 'REJECTED' },
      ]);

    return {
      id: `example-${String(sequence).padStart(10, '0')}`,
      consultationId: transient.consultationId,
      trainingLabelId: transient.trainingLabelId,

      // OpenAI/Anthropic JSONL format
      messages: JSON.stringify(
        transient.messages.length > 0
          ? transient.messages
          : [
              { role: 'system', content: '[active dental triage system prompt]' },
              { role: 'user', content: 'Mere dant mein dard hai' },
              { role: 'assistant', content: 'Ji, mein samajh gaya. Pehle yeh batao kab se hai?' },
            ],
      ),
      messageCount: transient.messages.length,

      // Metadata
      promptVersion: ACTIVE_PROMPT_VERSION,
      modelTargeted: faker.helpers.arrayElement([
        'claude-sonnet-4',
        'gpt-4-turbo',
        'datun-fine-tune-v1',
      ]),
      tokenCount: faker.number.int({ min: 200, max: 5000 }),

      // Approval workflow
      status,
      approvedBy:
        status === 'APPROVED' || status === 'EXPORTED'
          ? `user-${faker.number.int({ min: 1, max: 100 })}`
          : null,
      approvedAt:
        status === 'APPROVED' || status === 'EXPORTED' ? faker.date.recent({ days: 30 }) : null,
      rejectionReason: status === 'REJECTED' ? 'Quality below threshold' : null,
      exportedAt: status === 'EXPORTED' ? faker.date.recent({ days: 7 }) : null,
      exportBatchId: status === 'EXPORTED' ? `batch-${faker.string.alphanumeric(12)}` : null,

      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
    } as unknown as TrainingExample;
  },

  persist: async (ex, prisma) => {
    return prisma.trainingExample.upsert({
      where: { id: ex.id },
      create: ex as never,
      update: { updatedAt: new Date() },
    });
  },
});
