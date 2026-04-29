// ═══════════════════════════════════════════════════════════════
// CRON: Patient Follow-up Reminders
// 3-day: "How are you feeling?"
// 7-day: "Still need help?"
//
// TASK #39: Added EMAIL follow-up alongside WhatsApp.
// Dual-channel: WhatsApp + Email = 2x engagement.
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';
import { pingHealthcheck } from '../lib/healthcheck.js';
import { alertAdmin } from '../services/alert.service.js';
import { sendWhatsAppTemplate } from '../services/whatsapp/index.js';
import { emailClient } from '../services/email/index.js';
import { normalizeIndianPhone } from '../utils/phone.js';
import { env } from '../config/env.js';

export async function run3DayFollowUp(): Promise<void> {
  logger.info('[Cron] 3-day follow-up starting...');
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dayStart = new Date(threeDaysAgo.toISOString().split('T')[0]!);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    const consultations = await prisma.consultation.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: dayStart, lt: dayEnd },
        deletedAt: null,
        user: { phone: { not: null } },
      },
      include: {
        user: {
          select: { id: true, phone: true, email: true, name: true, languagePreference: true },
        },
      },
      take: 100,
    });

    let whatsappSent = 0;
    let emailSent = 0;

    for (const c of consultations) {
      // ── WhatsApp (existing) ──
      if (c.user.phone) {
        const phone = normalizeIndianPhone(c.user.phone);
        const alreadySentWa = await prisma.whatsAppMessage.findFirst({
          where: {
            phoneNumber: phone,
            templateName: 'datunai_3day_followup',
            consultationId: c.id,
          },
        });

        if (!alreadySentWa) {
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
          whatsappSent++;
        }
      }

      // ── Email (NEW — Task #39) ──
      if (c.user.email) {
        // Dedup: check EmailLog for existing 3-day follow-up
        const alreadySentEmail = await prisma.emailLog.findFirst({
          where: {
            to: c.user.email,
            template: 'follow_up_3day',
            consultationId: c.id,
          },
        });

        if (!alreadySentEmail) {
          await emailClient.send({
            to: c.user.email,
            template: 'follow_up_3day',
            vars: {
              name: c.user.name ?? 'there',
              diagnosis: c.chiefComplaint ?? 'your dental concern',
            },
            locale: c.user.languagePreference ?? 'en',
            userId: c.userId,
            consultationId: c.id,
          });
          emailSent++;
        }
      }
    }

    logger.info(
      `[Cron] 3-day follow-up complete: ${whatsappSent} WhatsApp + ${emailSent} emails sent of ${consultations.length} eligible`,
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
        user: {
          select: { id: true, phone: true, email: true, name: true, languagePreference: true },
        },
      },
      take: 100,
    });

    let whatsappSent = 0;
    let emailSent = 0;

    for (const c of consultations) {
      // ── WhatsApp (existing) ──
      if (c.user.phone) {
        const phone = normalizeIndianPhone(c.user.phone);
        const alreadySentWa = await prisma.whatsAppMessage.findFirst({
          where: {
            phoneNumber: phone,
            templateName: 'datunai_7day_followup',
            consultationId: c.id,
          },
        });

        if (!alreadySentWa) {
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
          whatsappSent++;
        }
      }

      // ── Email (NEW — Task #39) ──
      if (c.user.email) {
        const alreadySentEmail = await prisma.emailLog.findFirst({
          where: {
            to: c.user.email,
            template: 'follow_up_7day',
            consultationId: c.id,
          },
        });

        if (!alreadySentEmail) {
          await emailClient.send({
            to: c.user.email,
            template: 'follow_up_7day',
            vars: {
              name: c.user.name ?? 'there',
              diagnosis: c.chiefComplaint ?? 'your dental concern',
            },
            locale: c.user.languagePreference ?? 'en',
            userId: c.userId,
            consultationId: c.id,
          });
          emailSent++;
        }
      }
    }

    logger.info(
      `[Cron] 7-day follow-up complete: ${whatsappSent} WhatsApp + ${emailSent} emails sent of ${consultations.length} eligible`,
    );
    await pingHealthcheck(env.HEALTHCHECK_7DAY_URL);
  } catch (err) {
    logger.error('[Cron] 7-day follow-up failed', { error: (err as Error).message });
    Sentry.captureException(err);
    await pingHealthcheck(env.HEALTHCHECK_7DAY_URL, true);
    await alertAdmin('WARNING', '7-Day Follow-up Cron Failed', (err as Error).message);
  }
}
