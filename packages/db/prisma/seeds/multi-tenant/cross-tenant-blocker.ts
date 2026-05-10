import { PrismaClient } from '@prisma/client';

const TENANT_SCOPED = [
  'Patient',
  'Consultation',
  'Appointment',
  'Prescription',
  'WhatsappMessage',
  'Doctor',
  'ClinicMember',
];

export class CrossTenantQueryError extends Error {
  constructor(model: string, op: string) {
    super(`Cross-tenant violation: ${op} on ${model} requires clinicId in WHERE`);
    this.name = 'CrossTenantQueryError';
  }
}

/** Recursively check WHERE for clinicId — covers AND/OR/NOT bypass attempts */
function whereContainsClinicId(where: unknown): boolean {
  if (!where || typeof where !== 'object') return false;
  const w = where as Record<string, unknown>;
  if ('clinicId' in w && w.clinicId !== undefined && w.clinicId !== null) return true;
  if (Array.isArray(w.AND) && w.AND.every((c) => whereContainsClinicId(c))) return true;
  if (Array.isArray(w.OR) && w.OR.every((c) => whereContainsClinicId(c))) return true;
  if (w.NOT && whereContainsClinicId(w.NOT)) return false; // NOT clause doesn't satisfy
  return false;
}

export function withTenantBlocker(prisma: PrismaClient): PrismaClient {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, operation, args, query }) {
          if (TENANT_SCOPED.includes(model ?? '')) {
            const where = (args as { where?: unknown }).where ?? {};
            if (!whereContainsClinicId(where)) throw new CrossTenantQueryError(model!, operation);
          }
          return query(args);
        },
        async findFirst({ model, operation, args, query }) {
          if (TENANT_SCOPED.includes(model ?? '')) {
            const where = (args as { where?: unknown }).where ?? {};
            if (!whereContainsClinicId(where)) throw new CrossTenantQueryError(model!, operation);
          }
          return query(args);
        },
        async count({ model, operation, args, query }) {
          if (TENANT_SCOPED.includes(model ?? '')) {
            const where = (args as { where?: unknown }).where ?? {};
            if (!whereContainsClinicId(where)) throw new CrossTenantQueryError(model!, operation);
          }
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}
