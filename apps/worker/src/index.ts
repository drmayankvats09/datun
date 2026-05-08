// ═══════════════════════════════════════════════════════════════
// DATUN WORKER — Entry point
//
// Boot sequence:
//   1. dotenv load → 2. Sentry init → 3. env validate → 4. start workers
//   5. Graceful shutdown on SIGTERM/SIGINT
//
// Workers run independently of API. If API crashes, workers keep running.
// If worker crashes, API stays up serving requests.
// Pattern: Stripe job runners, Linear sync workers.
// ═══════════════════════════════════════════════════════════════

import 'dotenv/config';
import { Sentry } from './lib/sentry.js';
import { startHealthServer, stopHealthServer } from './lib/health-server.js';
import { recordJobSuccess, recordJobFailureMetric } from './lib/metrics.js';

import { Worker, type Job, type Processor } from 'bullmq';
import { QUEUE_NAMES, WORKER_LIMITERS, type QueueName } from '@repo/shared';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { createWorkerConnection } from './lib/connection.js';
import { recordJobStart, recordJobComplete, recordJobFailure } from './lib/job-audit.js';
import { processWhatsAppJob } from './processors/whatsapp.processor.js';
import { processEmailJob } from './processors/email.processor.js';
import { processPdfJob } from './processors/pdf.processor.js';
import { processScheduledJob } from './processors/scheduled.processor.js';
// Phase G additions (Task #43 production wiring)
import { processOutboxRelayJob } from './processors/outbox-relay.processor.js';
import { processOutboxDlqReplayJob } from './processors/outbox-dlq-replay.processor.js';
import { processDataQualityJob } from './processors/data-quality-daily.processor.js';
import { processDriftCheckJob } from './processors/drift-check-hourly.processor.js';
import { processShadowComparisonJob } from './processors/shadow-comparison-daily.processor.js';

const workers: Worker[] = [];

/**
 * Build a worker for a queue with its processor + audit wrapper.
 * The wrapper records job lifecycle to Postgres for audit + future ML training.
 */
function buildWorker(name: QueueName, concurrency: number, processor: Processor): Worker {
  const worker = new Worker(
    name,
    async (job: Job) => {
      const start = Date.now();
      await recordJobStart(job);
      try {
        const result = await processor(job, '');
        const durationMs = Date.now() - start;
        await recordJobComplete(job, result, durationMs);
        recordJobSuccess(name, durationMs);
        return result;
      } catch (err) {
        const durationMs = Date.now() - start;
        await recordJobFailure(job, err as Error, durationMs);
        recordJobFailureMetric(name, durationMs);
        const traceId = (job.data as { traceId?: string })?.traceId;
        Sentry.captureException(err, {
          extra: {
            jobId: job.id,
            jobName: job.name,
            queue: name,
            ...(traceId && { traceId }),
          },
        });
        throw err;
      }
    },

    {
      connection: createWorkerConnection(),
      concurrency,
      prefix: `datun:${env.NODE_ENV}:bullmq`,
      // Rate limiting — prevents provider 429s (Meta, Resend, etc)
      // Per-queue calibrated in @repo/shared WORKER_LIMITERS
      limiter: WORKER_LIMITERS[name],
    },
  );

  worker.on('completed', (job) => {
    const traceId = (job.data as { traceId?: string })?.traceId;
    logger.info(`[${name}] job completed`, {
      jobId: job.id,
      jobName: job.name,
      ...(traceId && { traceId }),
    });
  });

  worker.on('failed', (job, err) => {
    const traceId = (job?.data as { traceId?: string })?.traceId;
    logger.error(`[${name}] job failed`, {
      jobId: job?.id,
      jobName: job?.name,
      error: err.message,
      attempt: (job?.attemptsMade ?? 0) + 1,
      maxAttempts: job?.opts.attempts,
      ...(traceId && { traceId }),
    });
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`[${name}] job stalled — will be reprocessed`, { jobId });
  });

  worker.on('error', (err) => {
    logger.error(`[${name}] worker error`, {
      error: err.message,
    });
  });

  return worker;
}

async function main(): Promise<void> {
  logger.info('Datun worker starting...', {
    env: env.NODE_ENV,
    concurrency: {
      whatsapp: env.WORKER_CONCURRENCY_WHATSAPP,
      email: env.WORKER_CONCURRENCY_EMAIL,
      pdf: env.WORKER_CONCURRENCY_PDF,
      scheduled: env.WORKER_CONCURRENCY_SCHEDULED,
    },
  });

  workers.push(
    buildWorker(
      QUEUE_NAMES.WHATSAPP,
      env.WORKER_CONCURRENCY_WHATSAPP,
      processWhatsAppJob as Processor,
    ),
    buildWorker(QUEUE_NAMES.EMAIL, env.WORKER_CONCURRENCY_EMAIL, processEmailJob as Processor),
    buildWorker(QUEUE_NAMES.PDF, env.WORKER_CONCURRENCY_PDF, processPdfJob as Processor),
    buildWorker(
      QUEUE_NAMES.SCHEDULED,
      env.WORKER_CONCURRENCY_SCHEDULED,
      processScheduledJob as Processor,
    ),
    // Phase G additions — Task #43 production wiring (default OFF via flags)
    buildWorker(QUEUE_NAMES.OUTBOX_RELAY, 5, processOutboxRelayJob as Processor),
    buildWorker(QUEUE_NAMES.OUTBOX_DLQ_REPLAY, 1, processOutboxDlqReplayJob as Processor),
    buildWorker(QUEUE_NAMES.DATA_QUALITY, 1, processDataQualityJob as Processor),
    buildWorker(QUEUE_NAMES.DRIFT_CHECK, 1, processDriftCheckJob as Processor),
    buildWorker(QUEUE_NAMES.SHADOW_COMPARE, 1, processShadowComparisonJob as Processor),
  );

  // Start health server (port 4001) for Railway healthcheck + metrics
  startHealthServer();

  logger.info(`Datun worker ready — ${workers.length} workers active 🦷`);
}

// ═══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════

const DRAIN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max wait for in-flight jobs

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — beginning graceful drain (max ${DRAIN_TIMEOUT_MS}ms)`);

  // Stop health server first — Railway should mark unhealthy and stop routing
  try {
    await stopHealthServer();
  } catch (err) {
    logger.warn('Health server close error', { error: (err as Error).message });
  }

  // Each worker.close() returns when in-flight jobs complete OR timeout passes
  // BullMQ Worker.close(force=false) does NOT force-kill in-flight jobs;
  // it stops accepting new ones and waits for current to finish.
  const drainStart = Date.now();
  const drainPromise = Promise.all(
    workers.map((w) =>
      w.close().catch((err) => {
        logger.warn('Worker close error', {
          error: (err as Error).message,
        });
      }),
    ),
  );

  // Hard timeout — if a job runs longer than DRAIN_TIMEOUT_MS, force shutdown
  await Promise.race([
    drainPromise,
    new Promise((resolve) => setTimeout(resolve, DRAIN_TIMEOUT_MS)),
  ]);

  const drainMs = Date.now() - drainStart;
  if (drainMs >= DRAIN_TIMEOUT_MS) {
    logger.error(`Drain timeout exceeded — forcing shutdown after ${drainMs}ms`);
  } else {
    logger.info(`Drain complete in ${drainMs}ms`);
  }

  try {
    await Sentry.close(5000);
  } catch {
    // Silent
  }

  logger.info('Workers shutdown complete 🦷');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection in worker', { reason });
  Sentry.captureException(reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception in worker', { error: err.message });
  Sentry.captureException(err);
  // Don't exit immediately — let in-flight jobs finish if possible
});

main().catch((err) => {
  logger.error('Fatal worker startup error', { error: (err as Error).message });
  Sentry.captureException(err);
  process.exit(1);
});
