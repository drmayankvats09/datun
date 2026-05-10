// ═══════════════════════════════════════════════════════════════
// DRIFT CHECK HOURLY PROCESSOR
// ═══════════════════════════════════════════════════════════════

import type { Job } from 'bullmq';
import { prisma } from '@repo/db';
import { runDriftOrchestration } from '@repo/db/prisma/seeds/wave12';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';

export interface DriftCheckJobData {
  readonly baselineDays?: number;
  readonly comparisonDays?: number;
}

export interface DriftCheckJobResult {
  readonly runId: string;
  readonly overallVerdict: string;
  readonly alertsCount: number;
  readonly criticalCount: number;
  readonly durationMs: number;
}

export async function processDriftCheckJob(
  job: Job<DriftCheckJobData>,
): Promise<DriftCheckJobResult> {
  const enabled = process.env.DRIFT_TRACKING_ENABLED === 'true';
  if (!enabled) {
    logger.info('Drift tracking disabled by flag — skipping', { jobId: job.id });
    return {
      runId: 'skipped',
      overallVerdict: 'SKIPPED',
      alertsCount: 0,
      criticalCount: 0,
      durationMs: 0,
    };
  }

  const startedAt = Date.now();
  logger.info('Drift check hourly starting', { jobId: job.id });

  try {
    const report = await runDriftOrchestration({
      prisma,
      baselineDays: job.data.baselineDays,
      comparisonDays: job.data.comparisonDays,
      persistAlerts: true,
      strict: false,
    });

    const result: DriftCheckJobResult = {
      runId: report.runId,
      overallVerdict: report.overallVerdict,
      alertsCount: report.alerts.length,
      criticalCount: report.criticalAlerts.length,
      durationMs: Date.now() - startedAt,
    };

    if (report.overallVerdict === 'CRITICAL') {
      Sentry.captureMessage(`Drift CRITICAL — ${report.criticalAlerts.length} critical alerts`, {
        level: 'error',
        extra: { runId: report.runId, alerts: report.criticalAlerts },
      });
    } else if (report.overallVerdict === 'WARN') {
      logger.warn('Drift WARN', { runId: report.runId, alerts: report.alerts });
    }

    logger.info('Drift check hourly complete', { ...result });
    return result;
  } catch (err) {
    Sentry.captureException(err, { extra: { jobId: job.id } });
    throw err;
  }
}
