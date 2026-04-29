// ═══════════════════════════════════════════════════════════════
// CRON: Daily Business Report (9 AM IST)
// Queries Prisma for 24h metrics, sends branded email.
//
// TASK #39 MIGRATION: Direct Resend → emailClient.sendRaw()
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@repo/db';
import { BRAND, COLORS, CONTACTS, emailFooter } from '@repo/shared';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';
import { pingHealthcheck } from '../lib/healthcheck.js';
import { alertAdmin } from '../services/alert.service.js';
import { env } from '../config/env.js';
import { emailClient } from '../services/email/index.js';

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
<div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;background:${COLORS.bgDark};color:#fff;padding:24px;border-radius:12px">
  <h1 style="margin:0 0 8px;color:${COLORS.primary}">🦷 ${BRAND.name} — Daily Health Report</h1>
  <p style="margin:0 0 24px;color:${COLORS.muted};font-size:13px">${timeStr}</p>

  <h3 style="color:${COLORS.primary};margin-bottom:8px">📊 Last 24 Hours</h3>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:${COLORS.mint}">Consultations started</td><td style="text-align:right;font-weight:600">${totalConsultations24h}</td></tr>
    <tr><td style="padding:6px 0;color:${COLORS.mint}">Completed</td><td style="text-align:right;font-weight:600">${completedConsultations24h}</td></tr>
    <tr><td style="padding:6px 0;color:${COLORS.mint}">In progress / abandoned</td><td style="text-align:right;font-weight:600">${inProgress24h}</td></tr>
    <tr><td style="padding:6px 0;color:${COLORS.danger}">🚨 Emergencies</td><td style="text-align:right;font-weight:600;color:${COLORS.danger}">${emergencies24h}</td></tr>
    <tr><td style="padding:6px 0;color:${COLORS.mint}">New signups</td><td style="text-align:right;font-weight:600">${newUsers24h}</td></tr>
  </table>

  <h3 style="color:${COLORS.primary};margin-top:24px;margin-bottom:8px">📈 All-Time</h3>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:${COLORS.mint}">Total registered users</td><td style="text-align:right;font-weight:600">${totalUsers}</td></tr>
    <tr><td style="padding:6px 0;color:${COLORS.mint}">Total consultations</td><td style="text-align:right;font-weight:600">${totalConsultations}</td></tr>
  </table>

  ${emailFooter()}
</div>`;

    // Send via emailClient (circuit breaker + SES fallback + DB logging)
    await emailClient.sendRaw({
      to: env.ALERT_EMAIL_TO,
      subject: `📊 ${BRAND.name} Daily Report — ${dateStr}`,
      html,
      from: CONTACTS.systemEmailFrom,
      template: 'daily_report',
    });

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
