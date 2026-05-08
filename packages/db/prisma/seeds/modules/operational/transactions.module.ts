// ═══════════════════════════════════════════════════════════════
// PAYMENTS + REVIEWS — financial trail + user feedback
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { paymentFactory } from '../../factories/operational/payment.factory';
import { reviewFactory } from '../../factories/operational/review.factory';

export const paymentsModule = defineModule({
  name: 'operational.payments',
  description: 'Payment records for appointments + consultations',
  category: 'operational',
  version: '2.0.0',
  dependencies: ['operational.appointments'],
  modelsTouched: ['payment'],
  factoriesUsed: ['payment'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.APPOINTMENT_IDS, REGISTRY_KEYS.PATIENT_TO_CLINIC],
  providesRegistryKeys: [REGISTRY_KEYS.PAYMENT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(paymentsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1200);
      const appointmentIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.APPOINTMENT_IDS);
      const patientToClinic = ctx.registry.getRequired<Record<string, string>>(
        REGISTRY_KEYS.PATIENT_TO_CLINIC,
      );
      const patientIds = Object.keys(patientToClinic);

      const paymentIds: string[] = [];
      await runInScope(paymentsModule, ctx, async () => {
        for (let i = 0; i < appointmentIds.length; i++) {
          const patientId = patientIds[i % patientIds.length]!;
          const payment = paymentFactory.build(undefined, {
            entityId: appointmentIds[i]!,
            entityType: 'APPOINTMENT',
            clinicId: patientToClinic[patientId]!,
            patientId,
          });
          paymentIds.push(payment.id);
        }
      });

      ctx.registry.set(REGISTRY_KEYS.PAYMENT_IDS, paymentIds);
      ctx.logger.info(`✓ Payments built`, { count: paymentIds.length });

      return {
        recordsCreated: 0,
        recordsSkipped: paymentIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['payment'],
        modelsTouched: ['payment'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

export const reviewsModule = defineModule({
  name: 'operational.reviews',
  description: 'Patient reviews for clinics + consultations (~40% of completed)',
  category: 'operational',
  version: '2.0.0',
  dependencies: ['operational.appointments'],
  modelsTouched: ['review'],
  factoriesUsed: ['review'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.APPOINTMENT_IDS, REGISTRY_KEYS.PATIENT_TO_CLINIC],
  providesRegistryKeys: [REGISTRY_KEYS.REVIEW_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(reviewsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1250);
      const appointmentIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.APPOINTMENT_IDS);
      const patientToClinic = ctx.registry.getRequired<Record<string, string>>(
        REGISTRY_KEYS.PATIENT_TO_CLINIC,
      );
      const patientIds = Object.keys(patientToClinic);

      const reviewIds: string[] = [];
      await runInScope(reviewsModule, ctx, async () => {
        for (let i = 0; i < appointmentIds.length; i++) {
          if (i % 5 < 2) {
            // ~40%
            const patientId = patientIds[i % patientIds.length]!;
            const review = reviewFactory.build(undefined, {
              entityId: patientToClinic[patientId]!,
              entityType: 'CLINIC',
              patientId,
            });
            reviewIds.push(review.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.REVIEW_IDS, reviewIds);
      return {
        recordsCreated: 0,
        recordsSkipped: reviewIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['review'],
        modelsTouched: ['review'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
