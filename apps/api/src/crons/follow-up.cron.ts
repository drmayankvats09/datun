// ═══════════════════════════════════════════════════════════════
// CRON: Patient Follow-up Reminders
// 3-day: "How are you feeling?"
// 7-day: "Still need help?"
// Queries Prisma for consultations completed N days ago.
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';
import { pingHealthcheck } from '../lib/healthcheck.js';
import { alertAdmin } from '../services/alert.service.js';
import { sendWhatsAppTemplate } from '../services/whatsapp/index.js';
import { normalizeIndianPhone } from '../utils/phone.js';
import { env } from '../config/env.js';

export async function run3DayFollowUp(): Promise<void> {
  logger.info('[Cron] 3-day follow-up starting...');
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dayStart = new Date(threeDaysAgo.toISOString().split('T')[0]!);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    // Find completed consultations from exactly 3 days ago
    // that have a phone number and haven't been followed up yet
    const consultations = await prisma.consultation.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: dayStart, lt: dayEnd },
        deletedAt: null,
        user: { phone: { not: null } },
        // TODO: Add follow_up_3day_sent tracking field to schema
        // For now, we rely on WhatsAppMessage dedup
      },
      include: {
        user: { select: { phone: true, name: true } },
      },
      take: 100, // Safety cap — process max 100 per run
    });

    let sent = 0;
    for (const c of consultations) {
      if (!c.user.phone) continue;
      const phone = normalizeIndianPhone(c.user.phone);

      // Check if we already sent a 3-day follow-up to this phone
      const alreadySent = await prisma.whatsAppMessage.findFirst({
        where: {
          phoneNumber: phone,
          templateName: 'datunai_3day_followup',
          consultationId: c.id,
        },
      });
      if (alreadySent) continue;

      await sendWhatsAppTemplate(
        phone,
        'datunai_3day_followup',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: c.user.name ?? 'there' },
              { type: 'text', text: c.chiefComplaint ?? 'your dental concern' },
            ],
          },
        ],
        { userId: c.userId, consultationId: c.id },
      );
      sent++;
    }

    logger.info(
      `[Cron] 3-day follow-up complete: ${sent} sent of ${consultations.length} eligible`,
    );
    await pingHealthcheck(env.HEALTHCHECK_3DAY_URL);
  } catch (err) {
    logger.error('[Cron] 3-day follow-up failed', { error: (err as Error).message });
    Sentry.captureException(err);
    await pingHealthcheck(env.HEALTHCHECK_3DAY_URL, true);
    await alertAdmin('WARNING', '3-Day Follow-up Cron Failed', (err as Error).message);
  }
}

export async function run7DayFollowUp(): Promise<void> {
  logger.info('[Cron] 7-day follow-up starting...');
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dayStart = new Date(sevenDaysAgo.toISOString().split('T')[0]!);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    const consultations = await prisma.consultation.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: dayStart, lt: dayEnd },
        deletedAt: null,
        user: { phone: { not: null } },
      },
      include: {
        user: { select: { phone: true, name: true } },
      },
      take: 100,
    });

    let sent = 0;
    for (const c of consultations) {
      if (!c.user.phone) continue;
      const phone = normalizeIndianPhone(c.user.phone);

      const alreadySent = await prisma.whatsAppMessage.findFirst({
        where: {
          phoneNumber: phone,
          templateName: 'datunai_7day_followup',
          consultationId: c.id,
        },
      });
      if (alreadySent) continue;

      await sendWhatsAppTemplate(
        phone,
        'datunai_7day_followup',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: c.user.name ?? 'there' },
              { type: 'text', text: c.chiefComplaint ?? 'your dental concern' },
            ],
          },
        ],
        { userId: c.userId, consultationId: c.id },
      );
      sent++;
    }

    logger.info(
      `[Cron] 7-day follow-up complete: ${sent} sent of ${consultations.length} eligible`,
    );
    await pingHealthcheck(env.HEALTHCHECK_7DAY_URL);
  } catch (err) {
    logger.error('[Cron] 7-day follow-up failed', { error: (err as Error).message });
    Sentry.captureException(err);
    await pingHealthcheck(env.HEALTHCHECK_7DAY_URL, true);
    await alertAdmin('WARNING', '7-Day Follow-up Cron Failed', (err as Error).message);
  }
}
