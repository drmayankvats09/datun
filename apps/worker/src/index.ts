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

import { Worker, type Job, type Processor } from 'bullmq';
import { QUEUE_NAMES, type QueueName } from '@repo/shared';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { createWorkerConnection } from './lib/connection.js';
import { recordJobStart, recordJobComplete, recordJobFailure } from './lib/job-audit.js';
import { processWhatsAppJob } from './processors/whatsapp.processor.js';
import { processEmailJob } from './processors/email.processor.js';
import { processPdfJob } from './processors/pdf.processor.js';
import { processScheduledJob } from './processors/scheduled.processor.js';

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
        return result;
      } catch (err) {
        const durationMs = Date.now() - start;
        await recordJobFailure(job, err as Error, durationMs);
        Sentry.captureException(err, {
          extra: { jobId: job.id, jobName: job.name, queue: name },
        });
        throw err; // Re-throw so BullMQ marks job failed + schedules retry
      }
    },
    {
      connection: createWorkerConnection(),
      concurrency,
      prefix: `datun:${env.NODE_ENV}:bullmq`,
    },
  );

  worker.on('completed', (job) => {
    logger.info(`[${name}] job completed`, {
      jobId: job.id,
      jobName: job.name,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error(`[${name}] job failed`, {
      jobId: job?.id,
      jobName: job?.name,
      error: err.message,
      attempt: (job?.attemptsMade ?? 0) + 1,
      maxAttempts: job?.opts.attempts,
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
  );

  logger.info(`Datun worker ready — ${workers.length} workers active 🦷`);
}

// ═══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — closing workers gracefully...`);
  const closePromises = workers.map((w) =>
    w.close().catch((err) => {
      logger.warn('Worker close error', {
        error: (err as Error).message,
      });
    }),
  );
  await Promise.all(closePromises);

  try {
    await Sentry.close(5000);
  } catch {
    // Silent
  }

  logger.info('Workers shutdown complete');
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
