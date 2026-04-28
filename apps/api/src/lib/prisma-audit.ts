// ═══════════════════════════════════════════════════════════════
// PRISMA AUDIT — Query extension for Prisma v6+
// DPDP compliance: "kab, kisne, kya access kiya patient data."
// Uses $extends (Prisma v6 native) — replaces deprecated $use.
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

const SLOW_QUERY_THRESHOLD_MS = 500;

/**
 * Wrap PrismaClient with audit + slow query detection extension.
 * Returns NEW client instance — caller must use the returned one.
 */
export function registerAuditMiddleware(client: PrismaClient): PrismaClient {
  return client.$extends({
    name: 'datun-audit',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const queryStart = Date.now();
          const result = await query(args);
          const queryDuration = Date.now() - queryStart;

          // Slow query detection
          if (queryDuration > SLOW_QUERY_THRESHOLD_MS && model) {
            logSlowQuery(model, operation, queryDuration);
          }

          // Audit trail for sensitive operations
          if (model && AUDITED_MODELS.has(model) && AUDITED_ACTIONS.has(operation)) {
            const requestId = getRequestId();
            logger.info(`[AUDIT] ${model}.${operation}`, {
              audit: true,
              model,
              action: operation,
              requestId,
              durationMs: queryDuration,
              timestamp: new Date().toISOString(),
            });
          }

          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}
