// ═══════════════════════════════════════════════════════════════
// PRISMA AUDIT MIDDLEWARE — Audit trail + slow query detection
// DPDP compliance: "kab, kisne, kya access kiya patient data."
// Uses runtime check for $use (Prisma v6 may have removed it).
// Gracefully degrades — app never crashes from audit failure.
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@repo/db';
import { logger } from './logger.js';
import { logSlowQuery } from './prisma-query-logger.js';
import { getRequestId } from './request-context.js';

const AUDITED_MODELS = new Set([
  'User',
  'Consultation',
  'Assessment',
  'MedicalHistory',
  'ConsultationMessage',
  'ClinicOwner',
  'PatientProfile',
]);

const AUDITED_ACTIONS = new Set<string>(['create', 'update', 'delete', 'deleteMany', 'updateMany']);

/**
 * Register Prisma audit middleware + slow query detection.
 * Call ONCE after PrismaClient instantiation.
 * Runtime-safe for Prisma v5 AND v6.
 */
export function registerAuditMiddleware(client: PrismaClient): void {
  const clientAny = client as unknown as Record<string, unknown>;
  if (typeof clientAny['$use'] !== 'function') {
    logger.warn(
      '[Audit] Prisma $use middleware not available (v6+). ' +
        'Audit logging handled by security-logger.ts at service level.',
    );
    return;
  }

  const useMiddleware = clientAny['$use'] as (
    fn: (
      params: { model?: string; action: string; args: unknown },
      next: (params: unknown) => Promise<unknown>,
    ) => Promise<unknown>,
  ) => void;

  useMiddleware(async (params, next) => {
    const queryStart = Date.now();
    const result = await next(params);
    const queryDuration = Date.now() - queryStart;

    if (queryDuration > 500 && params.model) {
      logSlowQuery(params.model, params.action, queryDuration);
    }

    if (params.model && AUDITED_MODELS.has(params.model) && AUDITED_ACTIONS.has(params.action)) {
      const requestId = getRequestId();

      logger.info(`[AUDIT] ${params.model}.${params.action}`, {
        audit: true,
        model: params.model,
        action: params.action,
        requestId,
        durationMs: queryDuration,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  });
}
