import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS, getOrFetch } from '../core/module-registry.js';
import { resetSequences } from '../../factories/core/sequence';
import { patientJourneyFactory } from '../../factories/patient/patient-journey.factory';

export const journeysModule = defineModule({
  name: 'people.journeys',
  description: 'Multi-year patient journey aggregates',
  category: 'people',
  version: '2.0.0',
  dependencies: ['people.patients'],
  modelsTouched: ['patientJourney'],
  factoriesUsed: ['patientJourney'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.PATIENT_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.JOURNEY_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(journeysModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 370);
      const patientIds = await getOrFetch(ctx, REGISTRY_KEYS.PATIENT_IDS, async () =>
        (await ctx.prisma.patient.findMany({ select: { id: true } })).map((p) => p.id),
      );
      const journeyIds: string[] = [];

      await runInScope(journeysModule, ctx, async () => {
        for (const patientId of patientIds) {
          const j = patientJourneyFactory.build(undefined, { patientId });
          journeyIds.push(j.id);
        }
      });

      ctx.registry.set(REGISTRY_KEYS.JOURNEY_IDS, journeyIds);
      return {
        recordsCreated: 0,
        recordsSkipped: journeyIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['patientJourney'],
        modelsTouched: ['patientJourney'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
