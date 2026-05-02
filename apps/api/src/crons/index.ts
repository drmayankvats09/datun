// ═══════════════════════════════════════════════════════════════
// CRON REGISTRY — All scheduled jobs, one place
// Phase 7: Distributed lock (withCronLock) for multi-instance safety.
// Task #41: Feature-flagged via CRON_BACKEND env (node-cron vs bullmq).
// ═══════════════════════════════════════════════════════════════

import cron from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { withCronLock } from '../lib/cron-lock.js';
import { run3DayFollowUp, run7DayFollowUp } from './follow-up.cron.js';
import { runDailyReport } from './daily-report.cron.js';
import { runWhatsAppHeartbeat } from './whatsapp-heartbeat.cron.js';

const IST = 'Asia/Kolkata';

export function startCronJobs(): void {
  if (env.CRON_BACKEND === 'bullmq') {
    logger.info(
      '[Cron] CRON_BACKEND=bullmq — node-cron jobs NOT registered (BullMQ scheduled jobs primary)',
    );
    return;
  }

  logger.info('[Cron] Registering scheduled jobs (distributed-lock enabled)...');

  cron.schedule('0 10 * * *', withCronLock('3day-followup', run3DayFollowUp, 600), {
    timezone: IST,
  });

  cron.schedule('30 10 * * *', withCronLock('7day-followup', run7DayFollowUp, 600), {
    timezone: IST,
  });

  cron.schedule('0 9 * * *', withCronLock('daily-report', runDailyReport, 300), {
    timezone: IST,
  });

  cron.schedule('*/30 * * * *', withCronLock('whatsapp-heartbeat', runWhatsAppHeartbeat, 120), {
    timezone: IST,
  });

  logger.info('[Cron] 4 jobs registered with distributed locks ✅');
}
