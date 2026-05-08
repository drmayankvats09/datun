import { defineModule, environmentGuard, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { userFactory } from '../../factories/primitives/user.factory';
import { bulkInsert } from '../../factories/core/bulk-insert';

const TEAM_COUNT = 250;

export const teamUsersModule = defineModule({
  name: 'identity.team-users',
  description: '250 clinic staff users (receptionist, hygienist, etc.)',
  category: 'identity',
  version: '2.0.0',
  dependencies: [],
  modelsTouched: ['user'],
  factoriesUsed: ['user'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: {
    kind: 'CUSTOM',
    check: async (ctx) =>
      (await ctx.prisma.user.count({ where: { role: 'PATIENT' } })) > TEAM_COUNT * 5,
  },
  useTransaction: true,
  allowedEnvironments: ['development', 'test', 'staging'],
  providesRegistryKeys: [REGISTRY_KEYS.TEAM_USER_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(teamUsersModule, ctx, async () => {
      environmentGuard(teamUsersModule, ctx);
      resetSequences(ctx.masterSeed + 2000);

      const users = userFactory.buildList(TEAM_COUNT, undefined, { primaryRole: 'CLINIC_STAFF' });
      let created = 0;
      await runInScope(teamUsersModule, ctx, async (tx) => {
        const r = await bulkInsert(tx, 'user', users, { batchSize: 500, skipDuplicates: true });
        created = r.totalInserted;
      });

      ctx.registry.set(
        REGISTRY_KEYS.TEAM_USER_IDS,
        users.map((u) => u.id),
      );
      ctx.logger.info(`✓ Team users seeded`, { created });

      return {
        recordsCreated: created,
        recordsSkipped: 0,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['user'],
        modelsTouched: ['user'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: {},
      };
    }),
});
