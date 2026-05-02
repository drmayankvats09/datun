// ═══════════════════════════════════════════════════════════════
// DLQ MONITOR — Postgres-backed failure pattern detection
//
// Why Postgres (not Redis): JobLog is source of truth, Redis is ephemeral.
// BullMQ removeOnFail eventually cleans Redis; we need long memory for
// pattern detection across 7-day retention window.
//
// Thresholds (calibrated to avoid alert fatigue):
//   - 10+ failures, same queue+jobName, last 15min  → WARNING
//   - 50+ failures, any queue, last 1hr             → CRITICAL
//   - Single FAILED status (BullMQ retries done)    → handled by Sentry
//
// Scheduled: every 5 minutes via existing cron.
// Pattern: Stripe webhook delivery monitoring, Linear job audit alerts.
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@repo/db';
import type { JobStatus } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { alertAdmin } from './alert.service.js';

const WINDOW_15MIN_MS = 15 * 60 * 1000;
const WINDOW_1HR_MS = 60 * 60 * 1000;
const THRESHOLD_PER_JOB = 10;
const THRESHOLD_TOTAL = 50;

interface FailureCluster {
  queueName: string;
  jobName: string;
  count: number;
  sampleError: string | null;
}

interface FailureClusterRow {
  queueName: string;
  jobName: string;
  count: bigint;
  sampleError: string | null;
}

/**
 * Find clusters of failures grouped by (queue, jobName) in last 15min.
 * Returns clusters exceeding threshold for alerting.
 */
async function findFailureClusters(): Promise<FailureCluster[]> {
  const since = new Date(Date.now() - WINDOW_15MIN_MS);

  const rows = await prisma.$queryRaw<FailureClusterRow[]>`
    SELECT
      "queueName",
      "jobName",
      COUNT(*)::bigint AS count,
      (array_agg("error" ORDER BY "completedAt" DESC))[1] AS "sampleError"
    FROM "job_logs"
    WHERE "status" = 'FAILED'
      AND "completedAt" >= ${since}
    GROUP BY "queueName", "jobName"
    HAVING COUNT(*) >= ${THRESHOLD_PER_JOB}
  `;

  return rows.map((r: FailureClusterRow) => ({
    queueName: r.queueName,
    jobName: r.jobName,
    count: Number(r.count),
    sampleError: r.sampleError,
  }));
}

/**
 * Find total failures across ALL queues in last hour.
 * Used for system-wide degradation alert.
 */
async function getHourlyFailureTotal(): Promise<number> {
  const since = new Date(Date.now() - WINDOW_1HR_MS);
  const count = await prisma.jobLog.count({
    where: {
      status: 'FAILED' as JobStatus,
      completedAt: { gte: since },
    },
  });
  return count;
}

/**
 * Main scan — called by cron every 5 minutes.
 * Idempotent: alertAdmin has built-in 30-min cooldown via Redis dedup.
 */
export async function scanDlqAndAlert(): Promise<void> {
  try {
    const clusters = await findFailureClusters();
    let alertsRaised = 0;

    for (const cluster of clusters) {
      const alertKey = `dlq:${cluster.queueName}:${cluster.jobName}`;
      const errorPreview = (cluster.sampleError ?? 'Unknown').slice(0, 200);

      await alertAdmin(
        'WARNING',
        `Job failure cluster: ${cluster.queueName}/${cluster.jobName}`,
        `Queue: ${cluster.queueName}\n` +
          `Job: ${cluster.jobName}\n` +
          `Failures in last 15min: ${cluster.count}\n` +
          `Threshold: ${THRESHOLD_PER_JOB}\n\n` +
          `Sample error:\n${errorPreview}`,
        { cooldownMin: 30, alertKey },
      );
      alertsRaised += 1;
    }

    const hourlyTotal = await getHourlyFailureTotal();

    if (hourlyTotal >= THRESHOLD_TOTAL) {
      await alertAdmin(
        'CRITICAL',
        `Queue system degraded — ${hourlyTotal} failures in 1hr`,
        `Total failed jobs across all queues in last 1 hour: ${hourlyTotal}\n` +
          `Threshold: ${THRESHOLD_TOTAL}\n\n` +
          `Check /internal/queues dashboard for breakdown.\n` +
          `Likely causes: provider outage (Meta/Resend), Redis issues, ` +
          `or DB connection pool exhausted.`,
        { cooldownMin: 60, alertKey: 'dlq:system-degraded' },
      );
      alertsRaised += 1;
    }

    logger.info('[DLQ Monitor] scan complete', {
      clustersFound: clusters.length,
      hourlyTotal,
      alertsRaised,
    });
  } catch (err) {
    // DLQ monitor failure must NEVER crash cron — log and move on
    logger.error('[DLQ Monitor] scan failed', {
      error: (err as Error).message,
    });
  }
}

/**
 * Test-only export — same as scanDlqAndAlert but returns counts.
 * Production code calls scanDlqAndAlert() (void return) for cron compatibility.
 */
export async function scanDlqAndAlertWithStats(): Promise<{
  clustersFound: number;
  hourlyTotal: number;
  alertsRaised: number;
}> {
  let alertsRaised = 0;
  try {
    const clusters = await findFailureClusters();

    for (const cluster of clusters) {
      const alertKey = `dlq:${cluster.queueName}:${cluster.jobName}`;
      const errorPreview = (cluster.sampleError ?? 'Unknown').slice(0, 200);
      await alertAdmin(
        'WARNING',
        `Job failure cluster: ${cluster.queueName}/${cluster.jobName}`,
        `Queue: ${cluster.queueName}\nJob: ${cluster.jobName}\n` +
          `Failures: ${cluster.count}\nSample:\n${errorPreview}`,
        { cooldownMin: 30, alertKey },
      );
      alertsRaised += 1;
    }

    const hourlyTotal = await getHourlyFailureTotal();
    if (hourlyTotal >= THRESHOLD_TOTAL) {
      await alertAdmin(
        'CRITICAL',
        `Queue system degraded — ${hourlyTotal} failures in 1hr`,
        `Total: ${hourlyTotal}, threshold: ${THRESHOLD_TOTAL}`,
        { cooldownMin: 60, alertKey: 'dlq:system-degraded' },
      );
      alertsRaised += 1;
    }

    return {
      clustersFound: clusters.length,
      hourlyTotal,
      alertsRaised,
    };
  } catch {
    return { clustersFound: 0, hourlyTotal: 0, alertsRaised: 0 };
  }
}
