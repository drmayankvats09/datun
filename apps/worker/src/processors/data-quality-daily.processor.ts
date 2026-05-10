// ═══════════════════════════════════════════════════════════════
// DATA QUALITY DAILY PROCESSOR
// ═══════════════════════════════════════════════════════════════

import type { Job } from 'bullmq';
import { prisma } from '@repo/db';
import { runDataQualityOrchestration, generateScorecard } from '@repo/db/prisma/seeds/wave8';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';

export interface DataQualityJobData {
  readonly strict?: boolean;
}

export interface DataQualityJobResult {
  readonly runId: string;
  readonly overallVerdict: string;
  readonly criticalCount: number;
  readonly scorecardOverall: number;
  readonly worstTable: string | null;
  readonly durationMs: number;
}

export async function processDataQualityJob(
  job: Job<DataQualityJobData>,
): Promise<DataQualityJobResult> {
  const enabled = process.env.DATA_QUALITY_ENABLED === 'true';
  if (!enabled) {
    logger.info('Data quality disabled by flag — skipping', { jobId: job.id });
    return {
      runId: 'skipped',
      overallVerdict: 'SKIPPED',
      criticalCount: 0,
      scorecardOverall: 100,
      worstTable: null,
      durationMs: 0,
    };
  }

  const startedAt = Date.now();
  logger.info('Data quality daily run starting', { jobId: job.id });

  try {
    const report = await runDataQualityOrchestration({
      prisma,
      runSoda: process.env.SODA_ENABLED === 'true',
      persistAnomalies: true,
      strict: job.data.strict ?? false,
    });
    const scorecard = generateScorecard(report);

    const result: DataQualityJobResult = {
      runId: report.runId,
      overallVerdict: report.overallVerdict,
      criticalCount: report.criticalFindings.length,
      scorecardOverall: scorecard.overallScore,
      worstTable: scorecard.tables[0]?.table ?? null,
      durationMs: Date.now() - startedAt,
    };

    if (report.criticalFindings.length > 0) {
      Sentry.captureMessage(`Data quality CRITICAL — ${report.criticalFindings.length} findings`, {
        level: 'error',
        extra: { runId: report.runId, findings: report.criticalFindings.slice(0, 10) },
      });
    }

    logger.info('Data quality daily run complete', { ...result });
    return result;
  } catch (err) {
    Sentry.captureException(err, { extra: { jobId: job.id } });
    throw err;
  }
}
