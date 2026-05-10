import { defineModule, environmentGuard, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS, getOrFetch } from '../core/module-registry.js';
import { SEED_ERROR_CODES, seedError } from '../../factories/core';
import { resetSequences } from '../../factories/core/sequence';
import { clinicFactory } from '../../factories/primitives/clinic.factory';
import { bulkInsert } from '../../factories/core/bulk-insert';

const CLINIC_COUNT = 50;

export const clinicsModule = defineModule({
  name: 'organization.clinics',
  description: `${CLINIC_COUNT} dental clinics across Indian cities`,
  category: 'organization',
  version: '2.0.0',
  dependencies: ['identity.owner-users'],
  modelsTouched: ['clinic'],
  factoriesUsed: ['clinic'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'COUNT_THRESHOLD', modelName: 'clinic', threshold: CLINIC_COUNT },
  useTransaction: true,
  allowedEnvironments: ['development', 'test', 'staging'],
  consumesRegistryKeys: [REGISTRY_KEYS.OWNER_USER_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.CLINIC_IDS, REGISTRY_KEYS.CLINIC_RECORDS],

  checkIdempotency: async (ctx) => (await ctx.prisma.clinic.count()) >= CLINIC_COUNT,

  run: async (ctx) =>
    measureExecution(clinicsModule, ctx, async () => {
      environmentGuard(clinicsModule, ctx);
      resetSequences(ctx.masterSeed + 100);
      const ownerIds = await getOrFetch(ctx, REGISTRY_KEYS.OWNER_USER_IDS, async () =>
        (
          await ctx.prisma.user.findMany({ where: { primaryRole: 'OWNER' }, select: { id: true } })
        ).map((u) => u.id),
      );
      if (ownerIds.length < CLINIC_COUNT) {
        throw seedError(
          SEED_ERROR_CODES.MODULE_INSUFFICIENT_DEPENDENCIES,
          `Need ${CLINIC_COUNT} owner users, got ${ownerIds.length}`,
          { module: 'organization/clinics' },
        );
      }

      const tier1 = clinicFactory.buildList(20, undefined, { cityTier: 'tier-1' });
      const tier2 = clinicFactory.buildList(20, undefined, { cityTier: 'tier-2' });
      const tier3 = clinicFactory.buildList(10, undefined, { cityTier: 'tier-3' });
      const all = [...tier1, ...tier2, ...tier3].map((c, i) => ({ ...c, ownerId: ownerIds[i]! }));

      let created = 0;
      await runInScope(clinicsModule, ctx, async (tx) => {
        const r = await bulkInsert(tx, 'clinic', all, { batchSize: 500, skipDuplicates: true });
        created = r.totalInserted;
      });

      ctx.registry.set(
        REGISTRY_KEYS.CLINIC_IDS,
        all.map((c) => c.id),
      );
      ctx.registry.set(REGISTRY_KEYS.CLINIC_RECORDS, all);
      ctx.logger.info(`✓ Clinics seeded`, { created });

      return {
        recordsCreated: created,
        recordsSkipped: CLINIC_COUNT - created,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['clinic'],
        modelsTouched: ['clinic'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { tier1: 20, tier2: 20, tier3: 10 },
      };
    }),

  hydrateRegistry: async (ctx) => {
    const clinics = await ctx.prisma.clinic.findMany();
    ctx.registry.set(
      REGISTRY_KEYS.CLINIC_IDS,
      clinics.map((c) => c.id),
    );
    ctx.registry.set(REGISTRY_KEYS.CLINIC_RECORDS, clinics);
  },

  compensate: async (ctx) => {
    const ids = ctx.registry.get<string[]>(REGISTRY_KEYS.CLINIC_IDS);
    if (ids) await ctx.prisma.clinic.deleteMany({ where: { id: { in: ids } } });
  },
});
