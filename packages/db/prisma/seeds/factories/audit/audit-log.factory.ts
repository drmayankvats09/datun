// ═══════════════════════════════════════════════════════════════
// AUDIT LOG FACTORY — DPDP Act 2023 compliance trail (B-3 v2)
//
// Schema alignment (packages/db/prisma/schema.prisma → model AuditLog):
//   Required:  id, action (String), entityType (String), entityId (String),
//              createdAt
//   Optional:  userId (uuid), changes (Json?), ipAddress, userAgent,
//              metadata (Json?)
//
// IMPORTANT: AuditAction + AuditResource are NOT Prisma enums — schema uses
// free-form String fields. We model these as local TS unions for factory
// type-safety while staying schema-compatible at persist time.
//
// Pattern: Stripe webhook event names (free-string with curated enum-like union).
// ═══════════════════════════════════════════════════════════════

import { Prisma, type AuditLog, type PrismaClient } from '@prisma/client';
import { defineFactory, prismaInput, toNullableJsonInput } from '../core';

// ─────────────────────────────────────────────────────────────────
// LOCAL TYPE UNIONS — Mirror common DPDP audit semantics.
// Stored as String in schema; this gives factory compile-time safety.
// ─────────────────────────────────────────────────────────────────
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
  | 'PHOTO_DELETE';

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
  readonly actorUserId: string;
  readonly resource: AuditResource;
  readonly resourceId: string;
  readonly action: AuditAction;
  readonly forceTimestamp?: Date;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

// ─────────────────────────────────────────────────────────────────
// FACTORY DEFINITION
// ─────────────────────────────────────────────────────────────────
export const auditLogFactory = defineFactory<AuditLog, AuditLogTransient>({
  name: 'audit-log',
  defaultTransient: {
    actorUserId: '',
    resource: 'PATIENT',
    resourceId: '',
    action: 'READ',
  },

  build: ({ sequence, faker, transient }) => {
    if (!transient.actorUserId) {
      throw new Error('[audit-log.factory] actorUserId required');
    }
    if (!transient.resourceId) {
      throw new Error('[audit-log.factory] resourceId required');
    }

    const createdAt = transient.forceTimestamp ?? faker.date.recent({ days: 30 });

    // Realistic IP — Indian ISP range (DPDP-compliant geo)
    const ipAddress =
      transient.ipAddress ??
      faker.helpers.arrayElement([
        `103.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}`, // Indian RIPE allocation
        `49.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}`,
      ]);

    return {
      id: `audit-${String(sequence).padStart(12, '0')}`,
      userId: transient.actorUserId,
      action: transient.action,
      entityType: transient.resource,
      entityId: transient.resourceId,
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
