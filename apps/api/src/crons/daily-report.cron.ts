// ═══════════════════════════════════════════════════════════════
// CRON: Daily Business Report (9 AM IST)
// Queries Prisma for 24h metrics, sends branded email.
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';
import { pingHealthcheck } from '../lib/healthcheck.js';
import { alertAdmin } from '../services/alert.service.js';
import { env } from '../config/env.js';
import { Resend } from 'resend';

export async function runDailyReport(): Promise<void> {
  logger.info('[Cron] Daily report starting...');
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);

    const [
      totalConsultations24h,
      completedConsultations24h,
      newUsers24h,
      totalUsers,
      totalConsultations,
      emergencies24h,
    ] = await Promise.all([
      prisma.consultation.count({ where: { createdAt: { gte: yesterday } } }),
      prisma.consultation.count({
        where: { createdAt: { gte: yesterday }, status: 'COMPLETED' },
      }),
      prisma.user.count({ where: { createdAt: { gte: yesterday } } }),
      prisma.user.count(),
      prisma.consultation.count({ where: { deletedAt: null } }),
      prisma.consultation.count({
        where: { createdAt: { gte: yesterday }, urgency: 'EMERGENCY' },
      }),
    ]);

    const inProgress24h = totalConsultations24h - completedConsultations24h;
    const dateStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const timeStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const html = `
<div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;background:#0a0f1a;color:#fff;padding:24px;border-radius:12px">
  <h1 style="margin:0 0 8px;color:#12c4b2">🦷 Datun — Daily Health Report</h1>
  <p style="margin:0 0 24px;color:#888;font-size:13px">${timeStr}</p>

  <h3 style="color:#12c4b2;margin-bottom:8px">📊 Last 24 Hours</h3>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#a7f3d0">Consultations started</td><td style="text-align:right;font-weight:600">${totalConsultations24h}</td></tr>
    <tr><td style="padding:6px 0;color:#a7f3d0">Completed</td><td style="text-align:right;font-weight:600">${completedConsultations24h}</td></tr>
    <tr><td style="padding:6px 0;color:#a7f3d0">In progress / abandoned</td><td style="text-align:right;font-weight:600">${inProgress24h}</td></tr>
    <tr><td style="padding:6px 0;color:#fca5a5">🚨 Emergencies</td><td style="text-align:right;font-weight:600;color:#fca5a5">${emergencies24h}</td></tr>
    <tr><td style="padding:6px 0;color:#a7f3d0">New signups</td><td style="text-align:right;font-weight:600">${newUsers24h}</td></tr>
  </table>

  <h3 style="color:#12c4b2;margin-top:24px;margin-bottom:8px">📈 All-Time</h3>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#a7f3d0">Total registered users</td><td style="text-align:right;font-weight:600">${totalUsers}</td></tr>
    <tr><td style="padding:6px 0;color:#a7f3d0">Total consultations</td><td style="text-align:right;font-weight:600">${totalConsultations}</td></tr>
  </table>

  <p style="margin-top:32px;padding-top:16px;border-top:1px solid #1e2a3a;color:#888;font-size:12px;text-align:center">
    Everyone Deserves a Doctor.<br/>— Datun Automated Reports
  </p>
</div>`;

    // Send email
    if (env.RESEND_API_KEY) {
      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Datun System <system@datunai.com>',
        to: [env.ALERT_EMAIL_TO],
        subject: `📊 Datun Daily Report — ${dateStr}`,
        html,
      });
    }

    logger.info('[Cron] Daily report sent', {
      consultations24h: totalConsultations24h,
      newUsers24h,
    });
    await pingHealthcheck(env.HEALTHCHECK_DAILY_REPORT_URL);
  } catch (err) {
    logger.error('[Cron] Daily report failed', { error: (err as Error).message });
    Sentry.captureException(err);
    await pingHealthcheck(env.HEALTHCHECK_DAILY_REPORT_URL, true);
    await alertAdmin('WARNING', 'Daily Report Cron Failed', (err as Error).message);
  }
}
