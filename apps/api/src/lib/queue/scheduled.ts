// ═══════════════════════════════════════════════════════════════
// SCHEDULED JOBS REGISTRATION — BullMQ Repeatable Jobs
//
// These run continuously per cron pattern, processed by worker.
// Active when CRON_BACKEND=bullmq. During soak (default node-cron),
// these are registered but jobs are immediately removed before execution
// to prevent duplicate work alongside node-cron.
//
// Pattern: BullMQ Job Schedulers (https://docs.bullmq.io/guide/job-schedulers)
// ═══════════════════════════════════════════════════════════════

import { QUEUE_NAMES, SCHEDULED_JOB_NAMES, type ScheduledJobName } from '@repo/shared';
import { getQueue } from './queues.js';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';

const TZ = 'Asia/Kolkata';

interface ScheduleConfig {
  jobName: ScheduledJobName;
  pattern: string; // cron pattern
  description: string;
}

const SCHEDULES: ScheduleConfig[] = [
  {
    jobName: SCHEDULED_JOB_NAMES.FOLLOWUP_3DAY,
    pattern: '0 10 * * *', // 10:00 AM IST
    description: '3-day patient followup',
  },
  {
    jobName: SCHEDULED_JOB_NAMES.FOLLOWUP_7DAY,
    pattern: '30 10 * * *', // 10:30 AM IST
    description: '7-day patient followup',
  },
  {
    jobName: SCHEDULED_JOB_NAMES.DAILY_REPORT,
    pattern: '0 9 * * *', // 9:00 AM IST
    description: 'Daily business report',
  },
  {
    jobName: SCHEDULED_JOB_NAMES.WHATSAPP_HEARTBEAT,
    pattern: '*/30 * * * *', // every 30 min
    description: 'WhatsApp providers heartbeat',
  },
];

/**
 * Register all repeatable jobs. Idempotent — safe to call on every boot.
 *
 * Behavior depends on CRON_BACKEND:
 *   - node-cron (default): repeatable jobs registered but immediately drained
 *     so node-cron remains primary. This proves queue infra works without
 *     duplicating cron work during soak.
 *   - bullmq: repeatable jobs run normally; node-cron jobs become no-ops.
 */
export async function registerScheduledJobs(): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.SCHEDULED);
  if (!queue) {
    logger.info('[Scheduled] queue not configured — skipping registration');
    return;
  }

  // Clean up any old scheduler entries first (handles renamed jobs)
  const existingSchedulers = await queue.getJobSchedulers();
  for (const scheduler of existingSchedulers) {
    await queue.removeJobScheduler(scheduler.key);
  }

  if (env.CRON_BACKEND === 'node-cron') {
    logger.info('[Scheduled] CRON_BACKEND=node-cron — repeatable jobs NOT registered (soak mode)');
    return;
  }

  // CRON_BACKEND=bullmq → register all
  for (const cfg of SCHEDULES) {
    await queue.upsertJobScheduler(
      cfg.jobName, // scheduler key
      { pattern: cfg.pattern, tz: TZ },
      {
        name: cfg.jobName,
        data: {},
        opts: {
          // Repeatable jobs need a unique jobId per occurrence —
          // BullMQ adds timestamp automatically, no need for explicit jobId
        },
      },
    );
    logger.info(`[Scheduled] registered: ${cfg.description}`, {
      jobName: cfg.jobName,
      pattern: cfg.pattern,
    });
  }
}
