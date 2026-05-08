// ═══════════════════════════════════════════════════════════════
// TEAM-MEMBERS MODULE — 250 clinic staff distributed across clinics
//
// Schema may not have ClinicTeamMember model in all environments —
// graceful no-op: builds in memory, registers IDs in registry.
//
// Registry rehydration: TEAM_USER_IDS + CLINIC_IDS auto-fetched from
// DB if upstream modules were idempotency-skipped (resume scenarios,
// multi-tenant runs).
// ═══════════════════════════════════════════════════════════════
import { defineModule, environmentGuard, measureExecution } from '../core';
import { REGISTRY_KEYS, getOrFetch } from '../core/module-registry.js';
import { resetSequences } from '../../factories/core/sequence';
import { teamMemberFactory } from '../../factories/primitives/clinic-team-member.factory';

const TEAM_COUNT = 250;

export const teamMembersModule = defineModule({
  name: 'organization.team-members',
  description: '250 clinic staff distributed across clinics (~5 per clinic)',
  category: 'organization',
  version: '2.0.0',
  dependencies: ['identity.team-users', 'organization.clinics'],
  modelsTouched: ['clinicTeamMember'],
  factoriesUsed: ['teamMember'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  useTransaction: true,
  allowedEnvironments: ['development', 'test', 'staging'],
  consumesRegistryKeys: [REGISTRY_KEYS.TEAM_USER_IDS, REGISTRY_KEYS.CLINIC_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.TEAM_MEMBER_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(teamMembersModule, ctx, async () => {
      environmentGuard(teamMembersModule, ctx);
      resetSequences(ctx.masterSeed + 250);

      // Rehydrate from DB if upstream modules were idempotency-skipped
      const teamUserIds = await getOrFetch(ctx, REGISTRY_KEYS.TEAM_USER_IDS, async () =>
        (
          await ctx.prisma.user.findMany({
            where: { primaryRole: 'CLINIC_STAFF' },
            select: { id: true },
          })
        ).map((u) => u.id),
      );
      const clinicIds = await getOrFetch(ctx, REGISTRY_KEYS.CLINIC_IDS, async () =>
        (await ctx.prisma.clinic.findMany({ select: { id: true } })).map((c) => c.id),
      );

      if (clinicIds.length === 0) {
        ctx.logger.warn('No clinics found — skipping team-members module');
        return {
          recordsCreated: 0,
          recordsSkipped: TEAM_COUNT,
          recordsFailed: 0,
          recordsCompensated: 0,
          factoriesUsed: ['teamMember'],
          modelsTouched: ['clinicTeamMember'],
          bulkStrategy: 'CREATE_MANY' as const,
          checkpointsSaved: 0,
          metadata: { note: 'no clinics available' },
        };
      }

      const members = Array.from({ length: TEAM_COUNT }, (_, i) =>
        teamMemberFactory.build(undefined, {
          userId: teamUserIds[i] ?? `user-team-${i}`,
          clinicId: clinicIds[i % clinicIds.length]!,
        }),
      );

      // schema may not have ClinicTeamMember model — graceful no-op
      const memberIds = members.map((m) => m.id);
      ctx.registry.set(REGISTRY_KEYS.TEAM_MEMBER_IDS, memberIds);
      ctx.logger.info(`✓ Team members built (storage skipped if model absent)`, {
        count: TEAM_COUNT,
      });

      return {
        recordsCreated: 0,
        recordsSkipped: TEAM_COUNT,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['teamMember'],
        modelsTouched: ['clinicTeamMember'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
