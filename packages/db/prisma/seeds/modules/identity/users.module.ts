// ═══════════════════════════════════════════════════════════════
// MODULES: identity.{admin|owner|doctor|patient|team}-users
// Bulk insert via createMany batched 1000.
// ═══════════════════════════════════════════════════════════════

import { defineModule, environmentGuard, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { userFactory } from '../../factories/primitives/user.factory';
import { bulkInsert } from '../../factories/core/bulk-insert';

interface UserModuleConfig {
  readonly role: 'ADMIN' | 'OWNER' | 'DOCTOR' | 'PATIENT';
  readonly count: number;
  readonly registryKey: string;
  readonly sequenceOffset: number;
}

function buildUsersModule(config: UserModuleConfig) {
  const moduleName = `identity.${config.role.toLowerCase()}-users`;

  const mod = defineModule({
    name: moduleName,
    description: `${config.count} ${config.role} users`,
    category: 'identity',
    version: '2.0.0',
    dependencies: [],
    modelsTouched: ['user'],
    factoriesUsed: ['user'],
    bulkStrategy: 'CREATE_MANY',
    // FAANG fix: NEVER strategy disables blanket count check.
    // Role-specific idempotency via checkIdempotency function below
    // (orchestrator falls through to function when strategy returns false).
    idempotencyStrategy: { kind: 'NEVER' },
    useTransaction: true,
    allowedEnvironments: ['development', 'test', 'staging'],
    providesRegistryKeys: [config.registryKey],
    transactionTimeoutMs: 120_000,

    checkIdempotency: async (ctx) => {
      // Use primaryRole (source of truth) instead of deprecated `role` mirror
      const c = await ctx.prisma.user.count({ where: { primaryRole: config.role } });
      return c >= config.count;
    },

    run: async (ctx) =>
      measureExecution(mod, ctx, async () => {
        environmentGuard(mod, ctx);
        resetSequences(ctx.masterSeed + config.sequenceOffset);

        const users = userFactory.buildList(config.count, undefined, { primaryRole: config.role });

        let created = 0;
        await runInScope(mod, ctx, async (tx) => {
          const result = await bulkInsert(tx, 'user', users, {
            batchSize: 1000,
            skipDuplicates: true,
          });
          created = result.totalInserted;
        });

        ctx.registry.set(
          config.registryKey,
          users.map((u) => u.id),
        );
        ctx.logger.info(`✓ ${config.role} users seeded`, { created });

        return {
          recordsCreated: created,
          recordsSkipped: config.count - created,
          recordsFailed: 0,
          recordsCompensated: 0,
          factoriesUsed: ['user'],
          modelsTouched: ['user'],
          bulkStrategy: 'CREATE_MANY' as const,
          checkpointsSaved: 0,
          metadata: { role: config.role, requested: config.count },
        };
      }),

    compensate: async (ctx) => {
      const ids = ctx.registry.get<string[]>(config.registryKey);
      if (ids) await ctx.prisma.user.deleteMany({ where: { id: { in: ids } } });
    },

    dryRun: async (ctx) => {
      const existing = await ctx.prisma.user.count({ where: { role: config.role } });
      return {
        wouldCreate: Math.max(0, config.count - existing),
        wouldSkip: existing,
        estimatedDurationMs: config.count * 0.5,
        estimatedMemoryMb: config.count / 5000,
        factoriesNeeded: ['user'],
        modelsTouched: ['user'],
      };
    },
  });

  return mod;
}

export const adminUsersModule = buildUsersModule({
  role: 'ADMIN',
  count: 5,
  registryKey: REGISTRY_KEYS.ADMIN_USER_IDS,
  sequenceOffset: 0,
});
export const ownerUsersModule = buildUsersModule({
  role: 'OWNER',
  count: 50,
  registryKey: REGISTRY_KEYS.OWNER_USER_IDS,
  sequenceOffset: 100,
});
export const doctorUsersModule = buildUsersModule({
  role: 'DOCTOR',
  count: 200,
  registryKey: REGISTRY_KEYS.DOCTOR_USER_IDS,
  sequenceOffset: 1000,
});
export const patientUsersModule = buildUsersModule({
  role: 'PATIENT',
  count: 1000,
  registryKey: REGISTRY_KEYS.PATIENT_USER_IDS,
  sequenceOffset: 5000,
});
