// ═══════════════════════════════════════════════════════════════
// EMAIL PROCESSOR — Sends via Resend (primary)
// Day 1: Resend only. Phase F adds SES fallback (parity with API).
// ═══════════════════════════════════════════════════════════════

import type { Job } from 'bullmq';
import { Resend } from 'resend';
import {
  EMAIL_JOB_NAMES,
  type EmailTemplatedJob,
  type EmailRawJob,
  type EmailJobName,
} from '@repo/shared';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    if (!env.RESEND_API_KEY) {
      throw new Error('[Email Worker] RESEND_API_KEY not set');
    }
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

type Payload = EmailTemplatedJob | EmailRawJob;

export async function processEmailJob(
  job: Job<Payload, { providerMessageId?: string }, EmailJobName>,
): Promise<{ providerMessageId?: string }> {
  if (!env.RESEND_API_KEY) {
    logger.warn('[Email Worker] RESEND_API_KEY not set — skipping job', {
      jobId: job.id,
    });
    return {};
  }

  const resend = getResend();
  const from = `Datun <hello@${env.RESEND_FROM_DOMAIN}>`;

  if (job.name === EMAIL_JOB_NAMES.SEND_RAW) {
    const data = job.data as EmailRawJob;
    try {
      const res = await resend.emails.send({
        from: data.from ?? from,
        to: data.to,
        subject: data.subject,
        html: data.html,
      });
      logger.info('[Email Worker] raw sent', {
        jobId: job.id,
        to: data.to,
        providerMessageId: res.data?.id,
      });
      return { providerMessageId: res.data?.id };
    } catch (err) {
      logger.error('[Email Worker] raw send failed', {
        jobId: job.id,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  if (job.name === EMAIL_JOB_NAMES.SEND_TEMPLATED) {
    const data = job.data as EmailTemplatedJob;
    // Day 1 stub: send variables JSON as body. Real templates come Task #58+.
    // We don't import API's template renderer to avoid coupling.
    const html = `<p>Template: ${data.template}</p><pre>${JSON.stringify(data.vars, null, 2)}</pre>`;
    try {
      const res = await resend.emails.send({
        from,
        to: data.to,
        subject: `Datun: ${data.template}`,
        html,
      });
      return { providerMessageId: res.data?.id };
    } catch (err) {
      logger.error('[Email Worker] templated send failed', {
        jobId: job.id,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  throw new Error(`Unknown email job name: ${String(job.name)}`);
}
