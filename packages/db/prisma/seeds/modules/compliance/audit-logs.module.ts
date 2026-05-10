// ═══════════════════════════════════════════════════════════════
// AUDIT LOGS — every consultation, appointment, prescription
// SOC 2 + DPDP requirements
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { auditLogFactory } from '../../factories/audit/audit-log.factory';
import { bulkInsert } from '../../factories/core/bulk-insert';

const BATCH_SIZE = 2000;

export const auditLogsModule = defineModule({
  name: 'compliance.audit-logs',
  description: 'Comprehensive audit trail for all entity changes',
  category: 'compliance',
  version: '2.0.0',
  dependencies: ['clinical.consultations', 'operational.appointments', 'clinical.prescriptions'],
  modelsTouched: ['auditLog'],
  factoriesUsed: ['auditLog'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'COUNT_THRESHOLD', modelName: 'auditLog', threshold: 5000 },
  useTransaction: true,
  transactionTimeoutMs: 240_000,
  consumesRegistryKeys: [
    REGISTRY_KEYS.CONSULTATION_IDS,
    REGISTRY_KEYS.APPOINTMENT_IDS,
    REGISTRY_KEYS.PRESCRIPTION_IDS,
    REGISTRY_KEYS.ADMIN_USER_IDS,
  ],
  providesRegistryKeys: [REGISTRY_KEYS.AUDIT_LOG_IDS],

  checkIdempotency: async (ctx) => (await ctx.prisma.auditLog.count()) >= 5000,

  run: async (ctx) =>
    measureExecution(auditLogsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1400);

      const consultations = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.CONSULTATION_IDS);
      const appointments = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.APPOINTMENT_IDS);
      const prescriptions = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PRESCRIPTION_IDS);
      // Admin users perform the audited actions; null fallback if missing
      const adminUserIds = ctx.registry.get<string[]>(REGISTRY_KEYS.ADMIN_USER_IDS) ?? [];

      const pickActor = (i: number): string | null =>
        adminUserIds.length > 0 ? adminUserIds[i % adminUserIds.length]! : null;

      const logs: ReturnType<typeof auditLogFactory.build>[] = [];

      consultations.forEach((id, i) => {
        logs.push(
          auditLogFactory.build(undefined, {
            actorUserId: pickActor(i),
            entityType: 'CONSULTATION',
            entityId: id,
            action: 'CREATE',
          }),
        );
        logs.push(
          auditLogFactory.build(undefined, {
            actorUserId: pickActor(i + 1),
            entityType: 'CONSULTATION',
            entityId: id,
            action: 'UPDATE',
          }),
        );
      });
      appointments.forEach((id, i) => {
        logs.push(
          auditLogFactory.build(undefined, {
            actorUserId: pickActor(i),
            entityType: 'APPOINTMENT',
            entityId: id,
            action: 'CREATE',
          }),
        );
      });
      prescriptions.forEach((id, i) => {
        logs.push(
          auditLogFactory.build(undefined, {
            actorUserId: pickActor(i),
            entityType: 'PRESCRIPTION',
            entityId: id,
            action: 'CREATE',
          }),
        );
      });

      let created = 0;
      await runInScope(auditLogsModule, ctx, async (tx) => {
        for (let i = 0; i < logs.length; i += BATCH_SIZE) {
          const batch = logs.slice(i, i + BATCH_SIZE);
          const r = await bulkInsert(tx, 'auditLog', batch, {
            batchSize: BATCH_SIZE,
            skipDuplicates: true,
          });
          created += r.totalInserted;
        }
      });

      ctx.registry.set(
        REGISTRY_KEYS.AUDIT_LOG_IDS,
        logs.map((l) => l.id),
      );
      ctx.logger.info(`✓ Audit logs seeded`, { created });

      return {
        recordsCreated: created,
        recordsSkipped: 0,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['auditLog'],
        modelsTouched: ['auditLog'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { totalLogs: logs.length },
      };
    }),
});
