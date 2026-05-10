// ═══════════════════════════════════════════════════════════════
// SCHEDULED JOBS REGISTRATION — BullMQ Repeatable Jobs
//
// These run continuously per cron pattern, processed by worker.
// Active when CRON_BACKEND=bullmq.
// ═══════════════════════════════════════════════════════════════

import {
  QUEUE_NAMES,
  SCHEDULED_JOB_NAMES,
  type ScheduledJobName,
  type QueueName,
} from '@repo/shared';
import { getQueue } from './queues.js';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';

const TZ = 'Asia/Kolkata';

interface ScheduleConfig {
  jobName: ScheduledJobName;
  pattern: string;
  description: string;
}

const SCHEDULES: ScheduleConfig[] = [
  {
    jobName: SCHEDULED_JOB_NAMES.FOLLOWUP_3DAY,
    pattern: '0 10 * * *',
    description: '3-day patient followup',
  },
  {
    jobName: SCHEDULED_JOB_NAMES.FOLLOWUP_7DAY,
    pattern: '30 10 * * *',
    description: '7-day patient followup',
  },
  {
    jobName: SCHEDULED_JOB_NAMES.DAILY_REPORT,
    pattern: '0 9 * * *',
    description: 'Daily business report',
  },
  {
    jobName: SCHEDULED_JOB_NAMES.WHATSAPP_HEARTBEAT,
    pattern: '*/30 * * * *',
    description: 'WhatsApp providers heartbeat',
  },
  // ─── Phase G additions ─────────────────────────────────────────
  {
    jobName: SCHEDULED_JOB_NAMES.OUTBOX_RELAY_TICK,
    pattern: '*/30 * * * * *', // every 30 seconds (BullMQ supports 6-field cron)
    description: 'Outbox relay tick — drains pending events',
  },
  {
    jobName: SCHEDULED_JOB_NAMES.DATA_QUALITY_DAILY,
    pattern: '0 2 * * *', // 02:00 IST
    description: 'Daily data quality scan',
  },
  {
    jobName: SCHEDULED_JOB_NAMES.DRIFT_CHECK_HOURLY,
    pattern: '15 * * * *', // every hour at :15
    description: 'Hourly AI drift check',
  },
  {
    jobName: SCHEDULED_JOB_NAMES.SHADOW_COMPARE_DAILY,
    pattern: '0 3 * * *', // 03:00 IST
    description: 'Daily shadow prompt comparison',
  },
];

// Map scheduled job → target queue (some jobs run on dedicated queues)
const JOB_TO_QUEUE: Partial<Record<ScheduledJobName, QueueName>> = {
  [SCHEDULED_JOB_NAMES.OUTBOX_RELAY_TICK]: QUEUE_NAMES.OUTBOX_RELAY,
  [SCHEDULED_JOB_NAMES.DATA_QUALITY_DAILY]: QUEUE_NAMES.DATA_QUALITY,
  [SCHEDULED_JOB_NAMES.DRIFT_CHECK_HOURLY]: QUEUE_NAMES.DRIFT_CHECK,
  [SCHEDULED_JOB_NAMES.SHADOW_COMPARE_DAILY]: QUEUE_NAMES.SHADOW_COMPARE,
};

/**
 * Register all repeatable jobs. Idempotent — safe to call on every boot.
 */
export async function registerScheduledJobs(): Promise<void> {
  const defaultQueue = getQueue(QUEUE_NAMES.SCHEDULED);
  if (!defaultQueue) {
    logger.info('[Scheduled] queue not configured — skipping registration');
    return;
  }

  // Clean up any old scheduler entries first (handles renamed jobs)
  // Run cleanup across all queues that may host schedules
  const allQueueNames = new Set<QueueName>([
    QUEUE_NAMES.SCHEDULED,
    ...Object.values(JOB_TO_QUEUE).filter((q): q is QueueName => Boolean(q)),
  ]);
  for (const qName of allQueueNames) {
    const q = getQueue(qName);
    if (!q) continue;
    const existing = await q.getJobSchedulers();
    for (const scheduler of existing) {
      await q.removeJobScheduler(scheduler.key);
    }
  }

  if (env.CRON_BACKEND === 'node-cron') {
    logger.info('[Scheduled] CRON_BACKEND=node-cron — repeatable jobs NOT registered (soak mode)');
    return;
  }

  // CRON_BACKEND=bullmq → register all
  for (const cfg of SCHEDULES) {
    const targetQueueName = JOB_TO_QUEUE[cfg.jobName] ?? QUEUE_NAMES.SCHEDULED;
    const targetQueue = getQueue(targetQueueName);
    if (!targetQueue) {
      logger.warn(`[Scheduled] queue ${targetQueueName} not configured — skipping ${cfg.jobName}`);
      continue;
    }
    await targetQueue.upsertJobScheduler(
      cfg.jobName,
      { pattern: cfg.pattern, tz: TZ },
      {
        name: cfg.jobName,
        data: {},
        opts: {},
      },
    );
    logger.info(`[Scheduled] registered: ${cfg.description}`, {
      jobName: cfg.jobName,
      pattern: cfg.pattern,
      queue: targetQueueName,
    });
  }
}
