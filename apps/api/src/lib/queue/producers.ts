// ═══════════════════════════════════════════════════════════════
// QUEUE PRODUCERS — Type-safe enqueue helpers
//
// Why this layer (vs direct queue.add):
//   1. Type safety — caller can't pass wrong shape
//   2. Idempotency — jobId computed automatically from business key
//   3. Logging — every enqueue logged with queue/job/userId context
//   4. Graceful degradation — if QUEUE_REDIS_URL not set, returns synthetic
//      result so caller doesn't crash (dev experience)
//
// Pattern: Stripe internal "publishEvent" wrappers, Linear ".dispatch()" methods
// ═══════════════════════════════════════════════════════════════

import type { JobsOptions } from 'bullmq';
import {
  QUEUE_NAMES,
  WHATSAPP_JOB_NAMES,
  EMAIL_JOB_NAMES,
  PDF_JOB_NAMES,
  type WhatsAppTemplateJob,
  type WhatsAppTextJob,
  type EmailTemplatedJob,
  type EmailRawJob,
  type ConsultationPdfJob,
} from '@repo/shared';
import { getQueue } from './queues.js';
import { logger } from '../logger.js';
import {
  buildWhatsAppTemplateJobId,
  buildWhatsAppTextJobId,
  buildEmailTemplatedJobId,
  buildEmailRawJobId,
  buildPdfConsultationJobId,
} from './job-id.js';

export interface EnqueueResult {
  ok: boolean;
  jobId?: string;
  reason?: string; // Why not enqueued (e.g., "queue not configured")
}

// ═══════════════════════════════════════════════════════════════
// WHATSAPP PRODUCER
// ═══════════════════════════════════════════════════════════════

export async function enqueueWhatsAppTemplate(
  payload: WhatsAppTemplateJob,
  options?: { delay?: number; salt?: string },
): Promise<EnqueueResult> {
  const queue = getQueue(QUEUE_NAMES.WHATSAPP);
  if (!queue) {
    logger.warn('[enqueue:whatsapp] queue not configured — job skipped');
    return { ok: false, reason: 'queue not configured' };
  }

  const jobId = buildWhatsAppTemplateJobId({
    userId: payload.userId ?? 'anon',
    templateName: payload.templateName,
    consultationId: payload.consultationId,
    salt: options?.salt,
  });

  const jobOpts: JobsOptions = { jobId };
  if (options?.delay) jobOpts.delay = options.delay;

  try {
    await queue.add(WHATSAPP_JOB_NAMES.SEND_TEMPLATE, payload, jobOpts);
    logger.info('[enqueue:whatsapp] template queued', {
      jobId,
      template: payload.templateName,
      userId: payload.userId,
    });
    return { ok: true, jobId };
  } catch (err) {
    logger.error('[enqueue:whatsapp] failed', {
      error: (err as Error).message,
      jobId,
    });
    return { ok: false, reason: (err as Error).message };
  }
}

export async function enqueueWhatsAppText(payload: WhatsAppTextJob): Promise<EnqueueResult> {
  const queue = getQueue(QUEUE_NAMES.WHATSAPP);
  if (!queue) {
    return { ok: false, reason: 'queue not configured' };
  }

  const jobId = buildWhatsAppTextJobId({
    phone: payload.phone,
    body: payload.body,
  });

  try {
    await queue.add(WHATSAPP_JOB_NAMES.SEND_TEXT, payload, { jobId });
    return { ok: true, jobId };
  } catch (err) {
    logger.error('[enqueue:whatsapp:text] failed', {
      error: (err as Error).message,
    });
    return { ok: false, reason: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════════════════════
// EMAIL PRODUCER
// ═══════════════════════════════════════════════════════════════

export async function enqueueEmailTemplated(
  payload: EmailTemplatedJob,
  options?: { delay?: number; salt?: string },
): Promise<EnqueueResult> {
  const queue = getQueue(QUEUE_NAMES.EMAIL);
  if (!queue) {
    return { ok: false, reason: 'queue not configured' };
  }

  const jobId = buildEmailTemplatedJobId({
    to: payload.to,
    template: payload.template,
    consultationId: payload.consultationId,
    salt: options?.salt,
  });

  const jobOpts: JobsOptions = { jobId };
  if (options?.delay) jobOpts.delay = options.delay;

  try {
    await queue.add(EMAIL_JOB_NAMES.SEND_TEMPLATED, payload, jobOpts);
    logger.info('[enqueue:email] templated queued', {
      jobId,
      template: payload.template,
    });
    return { ok: true, jobId };
  } catch (err) {
    logger.error('[enqueue:email] failed', {
      error: (err as Error).message,
      jobId,
    });
    return { ok: false, reason: (err as Error).message };
  }
}

export async function enqueueEmailRaw(payload: EmailRawJob): Promise<EnqueueResult> {
  const queue = getQueue(QUEUE_NAMES.EMAIL);
  if (!queue) {
    return { ok: false, reason: 'queue not configured' };
  }

  const jobId = buildEmailRawJobId({
    to: payload.to,
    subject: payload.subject,
  });

  try {
    await queue.add(EMAIL_JOB_NAMES.SEND_RAW, payload, { jobId });
    return { ok: true, jobId };
  } catch (err) {
    logger.error('[enqueue:email:raw] failed', {
      error: (err as Error).message,
    });
    return { ok: false, reason: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════════════════════
// PDF PRODUCER
// ═══════════════════════════════════════════════════════════════

export async function enqueueConsultationPdf(payload: ConsultationPdfJob): Promise<EnqueueResult> {
  const queue = getQueue(QUEUE_NAMES.PDF);
  if (!queue) {
    return { ok: false, reason: 'queue not configured' };
  }

  const jobId = buildPdfConsultationJobId(payload.consultationId);

  try {
    await queue.add(PDF_JOB_NAMES.CONSULTATION_REPORT, payload, { jobId });
    logger.info('[enqueue:pdf] consultation report queued', {
      jobId,
      consultationId: payload.consultationId,
    });
    return { ok: true, jobId };
  } catch (err) {
    logger.error('[enqueue:pdf] failed', {
      error: (err as Error).message,
      jobId,
    });
    return { ok: false, reason: (err as Error).message };
  }
}
