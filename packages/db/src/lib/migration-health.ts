/**
 * Migration Health — query helpers for the /health endpoint and dashboards.
 *
 * Surfaces:
 *   - Last applied migration name + timestamp + duration
 *   - Pending migrations count (for soft drift indicator)
 *   - Schema fingerprint comparison vs latest snapshot (hard drift indicator)
 *   - Aggregate stats for the last 30 days
 *
 * Output is JSON-shaped so it slots cleanly into:
 *   - GET /health (basic OK / degraded / critical mapping)
 *   - GET /internal/migration/status (full structure)
 *   - status.datunai.com integration
 */

import type { PrismaClient } from '@prisma/client';
import { getCurrentSchemaFingerprint } from './schema-fingerprint.js';

export type HealthStatus = 'ok' | 'degraded' | 'critical';

export interface MigrationHealth {
  status: HealthStatus;
  lastApplied: {
    name: string;
    appliedAt: string;
    appliedBy: string;
    durationMs: number;
    success: boolean;
  } | null;
  driftDetected: boolean;
  currentSchemaChecksum: string;
  lastRecordedChecksum: string | null;
  recentFailureCount: number;
  totalMigrationsApplied: number;
  oldestPendingMigrationAgeHours: number | null;
}

/**
 * Aggregate the migration system health into a single status object.
 *
 * Status mapping:
 *   - "ok"        → no drift, no recent failures, last apply succeeded
 *   - "degraded"  → drift detected OR a recent failure exists but not fatal
 *   - "critical"  → last applied migration FAILED and was not recovered
 */
export async function getMigrationHealth(prisma: PrismaClient): Promise<MigrationHealth> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [lastApply, recentFailures, totalApplied, currentChecksum] = await Promise.all([
    prisma.migrationAudit.findFirst({
      orderBy: { appliedAt: 'desc' },
    }),
    prisma.migrationAudit.count({
      where: { success: false, appliedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.migrationAudit.count(),
    getCurrentSchemaFingerprint().catch(() => 'unknown'),
  ]);

  const lastRecordedChecksum = lastApply?.schemaChecksum ?? null;
  const driftDetected =
    lastRecordedChecksum !== null &&
    currentChecksum !== 'unknown' &&
    currentChecksum !== lastRecordedChecksum;

  let status: HealthStatus = 'ok';
  if (lastApply && !lastApply.success) {
    status = 'critical';
  } else if (driftDetected || recentFailures > 0) {
    status = 'degraded';
  }

  return {
    status,
    lastApplied: lastApply
      ? {
          name: lastApply.migrationName,
          appliedAt: lastApply.appliedAt.toISOString(),
          appliedBy: lastApply.appliedBy,
          durationMs: lastApply.durationMs,
          success: lastApply.success,
        }
      : null,
    driftDetected,
    currentSchemaChecksum: currentChecksum,
    lastRecordedChecksum,
    recentFailureCount: recentFailures,
    totalMigrationsApplied: totalApplied,
    oldestPendingMigrationAgeHours: null,
  };
}

/**
 * Lightweight binary check — used by the main /health endpoint to add a
 * `migrations: { status }` field without paying for the full report.
 */
export async function getMigrationHealthLite(
  prisma: PrismaClient,
): Promise<{ status: HealthStatus; lastAppliedAt: string | null }> {
  const lastApply = await prisma.migrationAudit.findFirst({
    orderBy: { appliedAt: 'desc' },
    select: { success: true, appliedAt: true },
  });

  if (!lastApply) {
    // No audit history yet — system is fresh, treat as ok.
    return { status: 'ok', lastAppliedAt: null };
  }

  return {
    status: lastApply.success ? 'ok' : 'critical',
    lastAppliedAt: lastApply.appliedAt.toISOString(),
  };
}
