// ═══════════════════════════════════════════════════════════════
// WHATSAPP + NOTIFICATIONS — Meta Cloud API + push trail
// ═══════════════════════════════════════════════════════════════

import type { Consultation } from '@prisma/client';
import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { whatsappMessageFactory as whatsAppMessageFactory } from '../../factories/operational/whatsapp-message.factory';
import { notificationFactory } from '../../factories/operational/notification.factory';
import { bulkInsert } from '../../factories/core/bulk-insert';

const BATCH_SIZE = 1000;

export const whatsAppMessagesModule = defineModule({
  name: 'operational.whatsapp-messages',
  description: 'WhatsApp messages — consultation_complete, followup, reminders',
  category: 'operational',
  version: '2.0.0',
  dependencies: ['clinical.consultations', 'operational.appointments'],
  modelsTouched: ['whatsAppMessage'],
  factoriesUsed: ['whatsAppMessage'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'COUNT_THRESHOLD', modelName: 'whatsAppMessage', threshold: 1000 },
  useTransaction: true,
  transactionTimeoutMs: 120_000,
  consumesRegistryKeys: [REGISTRY_KEYS.CONSULTATION_RECORDS, REGISTRY_KEYS.APPOINTMENT_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.WHATSAPP_IDS],

  checkIdempotency: async (ctx) => (await ctx.prisma.whatsAppMessage.count()) >= 1000,

  run: async (ctx) =>
    measureExecution(whatsAppMessagesModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1000);
      const consultations = ctx.registry.getRequired<Consultation[]>(
        REGISTRY_KEYS.CONSULTATION_RECORDS,
      );
      const appointmentIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.APPOINTMENT_IDS);

      const messages: ReturnType<typeof whatsAppMessageFactory.build>[] = [];

      // Per consultation: at least consultation_complete template
      for (const c of consultations) {
        if (c.status !== 'COMPLETED') continue;
        if (!c.userId) continue; // schema-defensive
        messages.push(
          whatsAppMessageFactory.build(undefined, {
            phoneNumber: '+919999000000',
            recipientPhone: '+919999000000',
            userId: c.userId,
            patientId: c.patientId,
            consultationId: c.id,
            templateName: 'consultation_complete',
            relatedEntityType: 'CONSULTATION',
            relatedEntityId: c.id,
          }),
        );
        // 50% get 3-day followup
        if (c.id.charCodeAt(0) % 2 === 0) {
          messages.push(
            whatsAppMessageFactory.build(undefined, {
              phoneNumber: '+919999000000',
              recipientPhone: '+919999000000',
              userId: c.userId,
              patientId: c.patientId,
              consultationId: c.id,
              templateName: 'three_day_followup',
              relatedEntityType: 'CONSULTATION',
              relatedEntityId: c.id,
            }),
          );
        }
      }

      // Per appointment: reminder. userId optional in schema → null OK for these.
      for (const apptId of appointmentIds) {
        messages.push(
          whatsAppMessageFactory.build(undefined, {
            phoneNumber: '+919999000000',
            recipientPhone: '+919999000000',
            appointmentId: apptId,
            templateName: 'appointment_reminder',
            relatedEntityType: 'APPOINTMENT',
            relatedEntityId: apptId,
          }),
        );
      }

      let created = 0;
      await runInScope(whatsAppMessagesModule, ctx, async (tx) => {
        for (let i = 0; i < messages.length; i += BATCH_SIZE) {
          const batch = messages.slice(i, i + BATCH_SIZE);
          const r = await bulkInsert(tx, 'whatsAppMessage', batch, {
            batchSize: BATCH_SIZE,
            skipDuplicates: true,
          });
          created += r.totalInserted;
        }
      });

      ctx.registry.set(
        REGISTRY_KEYS.WHATSAPP_IDS,
        messages.map((m) => m.id),
      );
      ctx.logger.info(`✓ WhatsApp messages seeded`, { created });

      return {
        recordsCreated: created,
        recordsSkipped: 0,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['whatsAppMessage'],
        modelsTouched: ['whatsAppMessage'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: {},
      };
    }),

  compensate: async (ctx) => {
    const ids = ctx.registry.get<string[]>(REGISTRY_KEYS.WHATSAPP_IDS);
    if (ids) await ctx.prisma.whatsAppMessage.deleteMany({ where: { id: { in: ids } } });
  },
});

export const notificationsModule = defineModule({
  name: 'operational.notifications',
  description: 'Push + email + SMS notifications for users',
  category: 'operational',
  version: '2.0.0',
  dependencies: ['identity.patient-users', 'clinical.consultations'],
  modelsTouched: ['notification'],
  factoriesUsed: ['notification'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'COUNT_THRESHOLD', modelName: 'notification', threshold: 500 },
  useTransaction: true,
  consumesRegistryKeys: [REGISTRY_KEYS.PATIENT_USER_IDS, REGISTRY_KEYS.CONSULTATION_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.NOTIFICATION_IDS],

  checkIdempotency: async (ctx) => (await ctx.prisma.notification.count()) >= 500,

  run: async (ctx) =>
    measureExecution(notificationsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1100);
      const userIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.PATIENT_USER_IDS);
      const consultationIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.CONSULTATION_IDS);

      const notifications: ReturnType<typeof notificationFactory.build>[] = [];
      for (let i = 0; i < consultationIds.length && i < userIds.length * 3; i++) {
        notifications.push(
          notificationFactory.build(undefined, {
            userId: userIds[i % userIds.length]!,
            relatedEntityId: consultationIds[i]!,
          }),
        );
      }

      let created = 0;
      await runInScope(notificationsModule, ctx, async (tx) => {
        for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
          const batch = notifications.slice(i, i + BATCH_SIZE);
          const r = await bulkInsert(tx, 'notification', batch, {
            batchSize: BATCH_SIZE,
            skipDuplicates: true,
          });
          created += r.totalInserted;
        }
      });

      ctx.registry.set(
        REGISTRY_KEYS.NOTIFICATION_IDS,
        notifications.map((n) => n.id),
      );
      ctx.logger.info(`✓ Notifications seeded`, { created });

      return {
        recordsCreated: created,
        recordsSkipped: 0,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['notification'],
        modelsTouched: ['notification'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: {},
      };
    }),

  compensate: async (ctx) => {
    const ids = ctx.registry.get<string[]>(REGISTRY_KEYS.NOTIFICATION_IDS);
    if (ids) await ctx.prisma.notification.deleteMany({ where: { id: { in: ids } } });
  },
});
