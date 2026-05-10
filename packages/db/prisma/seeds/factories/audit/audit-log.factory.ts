// ═══════════════════════════════════════════════════════════════
// AUDIT LOG FACTORY — DPDP Act 2023 compliance trail (B-3 v2)
//
// SCHEMA-ALIGNED v2.0 — uses real UUID for `id` and tolerates null userId
// (schema marks userId as optional). Earlier version: id="audit-XXX" string,
// threw on missing actorUserId even though schema allows null.
//
// Schema (model AuditLog):
//   Required: id, action, entityType, entityId, createdAt
//   Optional: userId, changes, ipAddress, userAgent, metadata
// ═══════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto';
import { Prisma, type AuditLog } from '@prisma/client';
import { defineFactory, prismaInput, toNullableJsonInput } from '../core';

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'CONSENT_GRANT'
  | 'CONSENT_REVOKE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PRESCRIPTION_ISSUE'
  | 'PHOTO_UPLOAD'
  | 'PHOTO_DELETE'
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED';

export type AuditResource =
  | 'PATIENT'
  | 'CONSULTATION'
  | 'PRESCRIPTION'
  | 'APPOINTMENT'
  | 'CLINIC'
  | 'DOCTOR'
  | 'USER'
  | 'NOTIFICATION'
  | 'WHATSAPP_MESSAGE'
  | 'CONSENT_LOG'
  | 'DELETION_REQUEST'
  | 'PHOTO';

interface AuditLogTransient {
  /** Optional — schema's userId is nullable */
  readonly actorUserId?: string | null;
  readonly entityType: AuditResource | string;
  readonly entityId: string;
  readonly action: AuditAction | string;
  readonly forceTimestamp?: Date;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export const auditLogFactory = defineFactory<AuditLog, AuditLogTransient>({
  name: 'audit-log',
  defaultTransient: {
    entityType: 'PATIENT',
    entityId: '',
    action: 'READ',
  },

  build: ({ faker, transient }) => {
    if (!transient.entityId) {
      throw new Error('[audit-log.factory] entityId required');
    }

    const createdAt = transient.forceTimestamp ?? faker.date.recent({ days: 30 });

    // Realistic IP — Indian ISP range (DPDP-compliant geo)
    const ipAddress =
      transient.ipAddress ??
      faker.helpers.arrayElement([
        `103.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}`,
        `49.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}`,
      ]);

    return {
      id: randomUUID(),
      userId: transient.actorUserId ?? null,
      action: String(transient.action),
      entityType: String(transient.entityType),
      entityId: transient.entityId,
      changes: null,
      ipAddress,
      userAgent: transient.userAgent ?? faker.internet.userAgent(),
      metadata: null,
      createdAt,
    } as unknown as AuditLog;
  },

  persist: async (log, prisma) => {
    const a = log as Record<string, unknown>;
    return prisma.auditLog.create({
      data: prismaInput<Prisma.AuditLogUncheckedCreateInput>({
        id: a.id as string,
        userId: (a.userId as string | null | undefined) ?? null,
        action: a.action as string,
        entityType: a.entityType as string,
        entityId: a.entityId as string,
        changes: toNullableJsonInput(a.changes),
        ipAddress: (a.ipAddress as string | null | undefined) ?? null,
        userAgent: (a.userAgent as string | null | undefined) ?? null,
        metadata: toNullableJsonInput(a.metadata),
        createdAt: (a.createdAt as Date | undefined) ?? new Date(),
      }),
    }) as unknown as AuditLog;
  },
});
