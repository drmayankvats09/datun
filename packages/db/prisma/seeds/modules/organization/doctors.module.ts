import { defineModule, environmentGuard, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS, getOrFetch } from '../core/module-registry.js';
import { SEED_ERROR_CODES, seedError } from '../../factories/core';
import { resetSequences } from '../../factories/core/sequence';
import { doctorFactory } from '../../factories/primitives/doctor.factory';
import { bulkInsert } from '../../factories/core/bulk-insert';

const DOCTOR_COUNT = 200;

export const doctorsModule = defineModule({
  name: 'organization.doctors',
  description: `${DOCTOR_COUNT} dentists across clinics`,
  category: 'organization',
  version: '2.0.0',
  dependencies: ['identity.doctor-users', 'organization.clinics'],
  modelsTouched: ['doctor'],
  factoriesUsed: ['doctor'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'COUNT_THRESHOLD', modelName: 'doctor', threshold: DOCTOR_COUNT },
  useTransaction: true,
  allowedEnvironments: ['development', 'test', 'staging'],
  consumesRegistryKeys: [REGISTRY_KEYS.DOCTOR_USER_IDS, REGISTRY_KEYS.CLINIC_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.DOCTOR_IDS, REGISTRY_KEYS.DOCTOR_RECORDS],

  checkIdempotency: async (ctx) => (await ctx.prisma.doctor.count()) >= DOCTOR_COUNT,

  run: async (ctx) =>
    measureExecution(doctorsModule, ctx, async () => {
      environmentGuard(doctorsModule, ctx);
      resetSequences(ctx.masterSeed + 200);
      const userIds = await getOrFetch(ctx, REGISTRY_KEYS.DOCTOR_USER_IDS, async () =>
        (
          await ctx.prisma.user.findMany({ where: { primaryRole: 'DOCTOR' }, select: { id: true } })
        ).map((u) => u.id),
      );
      const clinicIds = await getOrFetch(ctx, REGISTRY_KEYS.CLINIC_IDS, async () =>
        (await ctx.prisma.clinic.findMany({ select: { id: true } })).map((c) => c.id),
      );
      if (userIds.length < DOCTOR_COUNT) {
        throw seedError(
          SEED_ERROR_CODES.MODULE_INSUFFICIENT_DEPENDENCIES,
          `Need ${DOCTOR_COUNT} doctor users`,
          { module: 'organization/doctors' },
        );
      }

      const doctors = doctorFactory.buildList(DOCTOR_COUNT).map((d, i) => ({
        ...d,
        userId: userIds[i]!,
        clinicId: clinicIds[i % clinicIds.length]!,
      }));

      let created = 0;
      await runInScope(doctorsModule, ctx, async (tx) => {
        const r = await bulkInsert(tx, 'doctor', doctors, { batchSize: 500, skipDuplicates: true });
        created = r.totalInserted;
      });

      ctx.registry.set(
        REGISTRY_KEYS.DOCTOR_IDS,
        doctors.map((d) => d.id),
      );
      ctx.registry.set(REGISTRY_KEYS.DOCTOR_RECORDS, doctors);
      ctx.logger.info(`✓ Doctors seeded`, { created });

      return {
        recordsCreated: created,
        recordsSkipped: DOCTOR_COUNT - created,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['doctor'],
        modelsTouched: ['doctor'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: {},
      };
    }),

  hydrateRegistry: async (ctx) => {
    const doctors = await ctx.prisma.doctor.findMany();
    ctx.registry.set(
      REGISTRY_KEYS.DOCTOR_IDS,
      doctors.map((d) => d.id),
    );
    ctx.registry.set(REGISTRY_KEYS.DOCTOR_RECORDS, doctors);
  },

  compensate: async (ctx) => {
    const ids = ctx.registry.get<string[]>(REGISTRY_KEYS.DOCTOR_IDS);
    if (ids) await ctx.prisma.doctor.deleteMany({ where: { id: { in: ids } } });
  },
});
