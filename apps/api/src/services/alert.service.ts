// ═══════════════════════════════════════════════════════════════
// ALERT SERVICE — Admin email notifications + dedup
// Severity-based alerts with cooldown to prevent spam.
// TODO: Move dedup state to Redis when Redis is added.
// ═══════════════════════════════════════════════════════════════

import { Resend } from 'resend';
import { BRAND, COLORS, CONTACTS, URLS } from '@repo/shared';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// In-memory dedup (TODO: Redis for persistence across restarts)
const dedup = new Map<string, number>();

type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

export async function alertAdmin(
  severity: Severity,
  title: string,
  details: string,
  opts: { cooldownMin?: number; alertKey?: string } = {},
): Promise<void> {
  const cooldownMin = opts.cooldownMin ?? 30;
  const alertKey = opts.alertKey ?? `${severity}:${title}`;
  const now = Date.now();

  // Dedup: suppress repeated alerts within cooldown
  const lastSent = dedup.get(alertKey) ?? 0;
  if (now - lastSent < cooldownMin * 60_000) {
    logger.debug(`Alert suppressed (cooldown): ${alertKey}`);
    return;
  }
  dedup.set(alertKey, now);

  const emoji = { CRITICAL: '🚨', WARNING: '⚠️', INFO: 'ℹ️' }[severity];
  const color =
    COLORS.alert[severity.toLowerCase() as keyof typeof COLORS.alert] ?? COLORS.alert.info;
  const subject = `${emoji} [${severity}] ${BRAND.name} — ${title}`;

  const safeDetails = String(details)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = `
<div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;background:${COLORS.bgDark};color:#fff;padding:24px;border-radius:12px">
  <h2 style="margin:0 0 16px;color:${color}">${emoji} ${BRAND.name} System Alert</h2>
  <p style="margin:8px 0"><strong>Severity:</strong> <span style="color:${color}">${severity}</span></p>
  <p style="margin:8px 0"><strong>Issue:</strong> ${title}</p>
  <p style="margin:8px 0"><strong>Time (IST):</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
  <pre style="background:${COLORS.bgDarkSecondary};padding:16px;border-radius:8px;font-family:monospace;white-space:pre-wrap;word-break:break-word;font-size:13px;color:${COLORS.mint}">${safeDetails}</pre>
  <p style="margin-top:24px;font-size:12px;color:${COLORS.muted}">${BRAND.name} · Automated Alert System · ${URLS.website}</p>
</div>`;

  // Send email
  if (resendClient) {
    try {
      await resendClient.emails.send({
        from: CONTACTS.systemEmailFrom,
        to: [env.ALERT_EMAIL_TO],
        subject,
        html,
      });
    } catch (e) {
      logger.error('Alert email failed', { error: (e as Error).message });
    }
  }

  // Also log + Sentry
  logger.error(`[ALERT][${severity}] ${title}: ${details}`);
  Sentry.captureMessage(`[${severity}] ${title}`, severity === 'CRITICAL' ? 'error' : 'warning');
}
