// ═══════════════════════════════════════════════════════════════
// ALERT SERVICE — Admin email notifications + dedup
// Severity-based alerts with cooldown to prevent spam.
// TODO: Move dedup state to Redis when Redis is added.
// ═══════════════════════════════════════════════════════════════

import { Resend } from 'resend';
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
  const color = { CRITICAL: '#dc2626', WARNING: '#f59e0b', INFO: '#0a9e8f' }[severity];
  const subject = `${emoji} [${severity}] Datun — ${title}`;

  const safeDetails = String(details)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = `
<div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;background:#0a0f1a;color:#fff;padding:24px;border-radius:12px">
  <h2 style="margin:0 0 16px;color:${color}">${emoji} Datun System Alert</h2>
  <p style="margin:8px 0"><strong>Severity:</strong> <span style="color:${color}">${severity}</span></p>
  <p style="margin:8px 0"><strong>Issue:</strong> ${title}</p>
  <p style="margin:8px 0"><strong>Time (IST):</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
  <pre style="background:#111827;padding:16px;border-radius:8px;font-family:monospace;white-space:pre-wrap;word-break:break-word;font-size:13px;color:#a7f3d0">${safeDetails}</pre>
  <p style="margin-top:24px;font-size:12px;color:#888">Datun · Automated Alert System · datunai.com</p>
</div>`;

  // Send email
  if (resendClient) {
    try {
      await resendClient.emails.send({
        from: 'Datun System <system@datunai.com>',
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
