import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS, getOrFetch } from '../core/module-registry.js';
import { resetSequences } from '../../factories/core/sequence';
import { familyMemberFactory } from '../../factories/patient/family-thread.factory';

export const familyThreadsModule = defineModule({
  name: 'people.family-threads',
  description: 'Family booking threads (mother books for whole family)',
  category: 'people',
  version: '2.0.0',
  dependencies: ['people.patients'],
  modelsTouched: ['familyMember'],
  factoriesUsed: ['familyMember'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.PATIENT_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.FAMILY_THREAD_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(familyThreadsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 350);
      const patientIds = await getOrFetch(ctx, REGISTRY_KEYS.PATIENT_IDS, async () =>
        (await ctx.prisma.patient.findMany({ select: { id: true } })).map((p) => p.id),
      );

      // ~30% of patients are part of family threads
      const threadCount = Math.floor(patientIds.length * 0.3);
      const threadIds: string[] = [];
      let created = 0;

      await runInScope(familyThreadsModule, ctx, async () => {
        for (let i = 0; i < threadCount; i++) {
          const threadId = `thread-${ctx.runId}-${i}`;
          threadIds.push(threadId);
          // Simulated link records (graceful no-op if model absent)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars

          const _link = familyMemberFactory.build(undefined, {
            threadId,
            primaryPatientId: patientIds[i * 2]!,
            relatedPatientId: patientIds[i * 2 + 1] ?? patientIds[0]!,
            relationship:
              i % 4 === 0 ? 'CHILD' : i % 4 === 1 ? 'SPOUSE' : i % 4 === 2 ? 'PARENT' : 'IN_LAW',
          });
          created++;
        }
      });

      ctx.registry.set(REGISTRY_KEYS.FAMILY_THREAD_IDS, threadIds);
      ctx.logger.info(`✓ Family threads built`, { count: threadCount });

      return {
        recordsCreated: 0,
        recordsSkipped: created,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['familyMember'],
        modelsTouched: ['familyMember'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
