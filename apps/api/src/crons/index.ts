// ═══════════════════════════════════════════════════════════════
// CRON REGISTRY — All scheduled jobs, one place
// Uses node-cron for now. Abstraction ready for BullMQ migration.
// To migrate to BullMQ: replace schedule() calls with queue.add()
// ═══════════════════════════════════════════════════════════════

import cron from 'node-cron';
import { logger } from '../lib/logger.js';
import { run3DayFollowUp, run7DayFollowUp } from './follow-up.cron.js';
import { runDailyReport } from './daily-report.cron.js';
import { runWhatsAppHeartbeat } from './whatsapp-heartbeat.cron.js';

const IST = 'Asia/Kolkata';

export function startCronJobs(): void {
  logger.info('[Cron] Registering scheduled jobs...');

  // 3-day follow-up: daily at 10:00 AM IST
  cron.schedule('0 10 * * *', run3DayFollowUp, { timezone: IST });

  // 7-day follow-up: daily at 10:30 AM IST
  cron.schedule('30 10 * * *', run7DayFollowUp, { timezone: IST });

  // Daily business report: 9:00 AM IST
  cron.schedule('0 9 * * *', runDailyReport, { timezone: IST });

  // WhatsApp API heartbeat: every 30 min
  cron.schedule('*/30 * * * *', runWhatsAppHeartbeat, { timezone: IST });

  logger.info('[Cron] 4 jobs registered ✅');
}
