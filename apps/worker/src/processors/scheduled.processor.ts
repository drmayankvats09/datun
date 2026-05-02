// ═══════════════════════════════════════════════════════════════
// SCHEDULED PROCESSOR — Cron-equivalent jobs (BullMQ Repeatable Jobs)
//
// These mirror the existing node-cron jobs:
//   - 3-day follow-up
//   - 7-day follow-up
//   - Daily report
//   - WhatsApp heartbeat
//
// During soak phase (CRON_BACKEND=node-cron), these run as backup.
// After cutover (CRON_BACKEND=bullmq), node-cron disabled, these primary.
//
// Day 1: STUBS that ping healthchecks. Real logic comes when API's
// crons get migrated (Phase G handles registration).
// ═══════════════════════════════════════════════════════════════

import type { Job } from 'bullmq';
import { SCHEDULED_JOB_NAMES, type ScheduledJobName } from '@repo/shared';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { pingHealthcheck } from '../lib/healthcheck.js';

export async function processScheduledJob(
  job: Job<unknown, { ok: boolean }, ScheduledJobName>,
): Promise<{ ok: boolean }> {
  logger.info('[Scheduled Worker] running', {
    jobId: job.id,
    jobName: job.name,
  });

  // Day 14 (Task #41): all 4 jobs are STUBS that just heartbeat.
  // Real DB queries + WA sends + email sends come in Phase G integration.
  // Strategy: keep node-cron primary (CRON_BACKEND=node-cron default);
  //   workers prove they can dequeue + heartbeat correctly first.
  switch (job.name) {
    case SCHEDULED_JOB_NAMES.FOLLOWUP_3DAY:
      logger.info('[Scheduled] 3-day followup tick (stub — node-cron is primary)');
      await pingHealthcheck(env.HEALTHCHECK_3DAY_URL);
      return { ok: true };

    case SCHEDULED_JOB_NAMES.FOLLOWUP_7DAY:
      logger.info('[Scheduled] 7-day followup tick (stub — node-cron is primary)');
      await pingHealthcheck(env.HEALTHCHECK_7DAY_URL);
      return { ok: true };

    case SCHEDULED_JOB_NAMES.DAILY_REPORT:
      logger.info('[Scheduled] daily report tick (stub — node-cron is primary)');
      await pingHealthcheck(env.HEALTHCHECK_DAILY_REPORT_URL);
      return { ok: true };

    case SCHEDULED_JOB_NAMES.WHATSAPP_HEARTBEAT:
      logger.info('[Scheduled] whatsapp heartbeat tick (stub — node-cron is primary)');
      await pingHealthcheck(env.HEALTHCHECK_WHATSAPP_URL);
      return { ok: true };

    default:
      throw new Error(`Unknown scheduled job name: ${String(job.name)}`);
  }
}
