// ═══════════════════════════════════════════════════════════════
// RESCHEDULES + CANCELLATIONS — appointment flow events
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { appointmentRescheduleFactory } from '../../factories/operational/appointment-reschedule.factory';
import { cancellationDetailFactory } from '../../factories/operational/cancellation-detail.factory';

export const reschedulesModule = defineModule({
  name: 'operational.reschedules',
  description: 'Appointment reschedule events (~15% of appointments)',
  category: 'operational',
  version: '2.0.0',
  dependencies: ['operational.appointments'],
  modelsTouched: ['appointmentReschedule'],
  factoriesUsed: ['appointmentReschedule'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.APPOINTMENT_IDS, REGISTRY_KEYS.PATIENT_TO_CLINIC],
  providesRegistryKeys: [REGISTRY_KEYS.RESCHEDULE_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(reschedulesModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1300);
      const appointmentIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.APPOINTMENT_IDS);
      const patientToClinic = ctx.registry.getRequired<Record<string, string>>(
        REGISTRY_KEYS.PATIENT_TO_CLINIC,
      );
      const patientIds = Object.keys(patientToClinic);

      const rescheduleIds: string[] = [];
      await runInScope(reschedulesModule, ctx, async () => {
        for (let i = 0; i < appointmentIds.length; i++) {
          if (i % 7 !== 0) continue;
          const r = appointmentRescheduleFactory.build(undefined, {
            appointmentId: appointmentIds[i]!,
            patientId: patientIds[i % patientIds.length]!,
          } as never);
          rescheduleIds.push(r.id);
        }
      });

      ctx.registry.set(REGISTRY_KEYS.RESCHEDULE_IDS, rescheduleIds);
      return {
        recordsCreated: 0,
        recordsSkipped: rescheduleIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['appointmentReschedule'],
        modelsTouched: ['appointmentReschedule'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const cancellationsModule = defineModule({
  name: 'operational.cancellations',
  description: 'Appointment cancellation details (~10% of appointments)',
  category: 'operational',
  version: '2.0.0',
  dependencies: ['operational.appointments'],
  modelsTouched: ['cancellationDetail'],
  factoriesUsed: ['cancellationDetail'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.APPOINTMENT_IDS, REGISTRY_KEYS.PATIENT_TO_CLINIC],
  providesRegistryKeys: [REGISTRY_KEYS.CANCELLATION_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(cancellationsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1350);
      const appointmentIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.APPOINTMENT_IDS);
      const patientIds = Object.keys(
        ctx.registry.getRequired<Record<string, string>>(REGISTRY_KEYS.PATIENT_TO_CLINIC),
      );

      const cancelIds: string[] = [];
      await runInScope(cancellationsModule, ctx, async () => {
        for (let i = 0; i < appointmentIds.length; i++) {
          if (i % 10 !== 0) continue;
          const c = cancellationDetailFactory.build(undefined, {
            appointmentId: appointmentIds[i]!,
            patientId: patientIds[i % patientIds.length]!,
          } as never);
          cancelIds.push(c.id);
        }
      });

      ctx.registry.set(REGISTRY_KEYS.CANCELLATION_IDS, cancelIds);
      return {
        recordsCreated: 0,
        recordsSkipped: cancelIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['cancellationDetail'],
        modelsTouched: ['cancellationDetail'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
