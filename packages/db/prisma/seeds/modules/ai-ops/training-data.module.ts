// ═══════════════════════════════════════════════════════════════
// TRAINING LABELS + EXAMPLES — fine-tuning dataset for Datun model
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { trainingLabelFactory } from '../../factories/ai-training/training-label.factory';
import { trainingExampleFactory } from '../../factories/ai-training/training-example.factory';
import { bulkInsert } from '../../factories/core/bulk-insert';

const LABEL_COUNT = 500;
const EXAMPLE_COUNT = 2000;

export const trainingLabelsModule = defineModule({
  name: 'ai-ops.training-labels',
  description: 'Annotated labels for AI fine-tuning',
  category: 'ai-ops',
  version: '2.0.0',
  dependencies: ['clinical.consultations'],
  modelsTouched: ['trainingLabel'],
  factoriesUsed: ['trainingLabel'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: {
    kind: 'COUNT_THRESHOLD',
    modelName: 'trainingLabel',
    threshold: LABEL_COUNT,
  },
  consumesRegistryKeys: [REGISTRY_KEYS.CONSULTATION_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.TRAINING_LABEL_IDS],

  checkIdempotency: async (ctx) => (await ctx.prisma.trainingLabel.count()) >= LABEL_COUNT,

  run: async (ctx) =>
    measureExecution(trainingLabelsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1600);
      const consultationIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.CONSULTATION_IDS);

      const labels = Array.from({ length: LABEL_COUNT }, (_, i) =>
        trainingLabelFactory.build(undefined, {
          consultationId: consultationIds[i % consultationIds.length],
        }),
      );

      let created = 0;
      await runInScope(trainingLabelsModule, ctx, async (tx) => {
        const r = await bulkInsert(tx, 'trainingLabel', labels, {
          batchSize: 500,
          skipDuplicates: true,
        });
        created = r.totalInserted;
      });

      ctx.registry.set(
        REGISTRY_KEYS.TRAINING_LABEL_IDS,
        labels.map((l) => l.id),
      );
      return {
        recordsCreated: created,
        recordsSkipped: 0,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['trainingLabel'],
        modelsTouched: ['trainingLabel'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: {},
      };
    }),
});

export const trainingExamplesModule = defineModule({
  name: 'ai-ops.training-examples',
  description: 'Few-shot training examples for fine-tuning',
  category: 'ai-ops',
  version: '2.0.0',
  dependencies: [],
  modelsTouched: ['trainingExample'],
  factoriesUsed: ['trainingExample'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: {
    kind: 'COUNT_THRESHOLD',
    modelName: 'trainingExample',
    threshold: EXAMPLE_COUNT,
  },
  providesRegistryKeys: [REGISTRY_KEYS.TRAINING_EXAMPLE_IDS],

  checkIdempotency: async (ctx) => (await ctx.prisma.trainingExample.count()) >= EXAMPLE_COUNT,

  run: async (ctx) =>
    measureExecution(trainingExamplesModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1650);
      const examples = trainingExampleFactory.buildList(EXAMPLE_COUNT);

      let created = 0;
      await runInScope(trainingExamplesModule, ctx, async (tx) => {
        const r = await bulkInsert(tx, 'trainingExample', examples, {
          batchSize: 1000,
          skipDuplicates: true,
        });
        created = r.totalInserted;
      });

      ctx.registry.set(
        REGISTRY_KEYS.TRAINING_EXAMPLE_IDS,
        examples.map((e) => e.id),
      );
      return {
        recordsCreated: created,
        recordsSkipped: 0,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['trainingExample'],
        modelsTouched: ['trainingExample'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: {},
      };
    }),
});
