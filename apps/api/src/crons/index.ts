// ═══════════════════════════════════════════════════════════════
// CRON REGISTRY — All scheduled jobs, one place
// Phase 7: Every job wrapped with distributed lock (withCronLock).
// If Railway scales to 2+ instances, only ONE runs each job.
// Pattern: Shopify Sidekiq unique jobs, Stripe job scheduler.
// ═══════════════════════════════════════════════════════════════

import cron from 'node-cron';
import { logger } from '../lib/logger.js';
import { withCronLock } from '../lib/cron-lock.js';
import { run3DayFollowUp, run7DayFollowUp } from './follow-up.cron.js';
import { runDailyReport } from './daily-report.cron.js';
import { runWhatsAppHeartbeat } from './whatsapp-heartbeat.cron.js';

const IST = 'Asia/Kolkata';

export function startCronJobs(): void {
  logger.info('[Cron] Registering scheduled jobs (distributed-lock enabled)...');

  // 3-day follow-up: daily at 10:00 AM IST
  // Lock TTL 600s (10 min) — job processes max 100 consultations, should finish in <2 min
  cron.schedule('0 10 * * *', withCronLock('3day-followup', run3DayFollowUp, 600), {
    timezone: IST,
  });

  // 7-day follow-up: daily at 10:30 AM IST
  // Lock TTL 600s — same pattern as 3-day
  cron.schedule('30 10 * * *', withCronLock('7day-followup', run7DayFollowUp, 600), {
    timezone: IST,
  });

  // Daily business report: 9:00 AM IST
  // Lock TTL 300s (5 min) — report is DB queries + 1 email, finishes in <30s
  cron.schedule('0 9 * * *', withCronLock('daily-report', runDailyReport, 300), {
    timezone: IST,
  });

  // WhatsApp API heartbeat: every 30 min
  // Lock TTL 120s (2 min) — single HTTP call, finishes in <5s
  // Short TTL because this runs frequently — don't block next run
  cron.schedule('*/30 * * * *', withCronLock('whatsapp-heartbeat', runWhatsAppHeartbeat, 120), {
    timezone: IST,
  });

  logger.info('[Cron] 4 jobs registered with distributed locks ✅');
}
