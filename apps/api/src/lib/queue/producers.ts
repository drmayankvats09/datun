// ═══════════════════════════════════════════════════════════════
// QUEUE PRODUCERS — Type-safe enqueue helpers
//
// Why this layer (vs direct queue.add):
//   1. Type safety — caller can't pass wrong shape
//   2. Idempotency — jobId computed automatically from business key
//   3. Logging — every enqueue logged with queue/job/userId context
//   4. Tracing (Task #41.5) — traceId auto-injected from request context
//                              or generated fresh; flows to worker + audit
//   5. Graceful degradation — if QUEUE_REDIS_URL not set, returns synthetic
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
  MEDIA_JOB_NAMES,
  generateTraceId,
  type WhatsAppTemplateJob,
  type WhatsAppTextJob,
  type EmailTemplatedJob,
  type EmailRawJob,
  type ConsultationPdfJob,
  type MediaProcessingJob,
} from '@repo/shared';
import { getQueue } from './queues.js';
import { logger } from '../logger.js';
import { getRequestId } from '../request-context.js';
import {
  buildWhatsAppTemplateJobId,
  buildWhatsAppTextJobId,
  buildEmailTemplatedJobId,
  buildEmailRawJobId,
  buildPdfConsultationJobId,
  buildMediaProcessingJobId,
} from './job-id.js';

export interface EnqueueResult {
  ok: boolean;
  jobId?: string;
  traceId?: string;
  reason?: string;
}

/**
 * Resolve traceId for a job:
 *   1. Use caller-provided value if set
 *   2. Else inherit from request context (HTTP request → job)
 *   3. Else generate fresh (cron/system enqueues)
 */
function resolveTraceId(provided?: string): string {
  if (provided) return provided;
  const requestId = getRequestId();
  if (requestId && requestId !== 'system') return requestId;
  return generateTraceId();
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
  const traceId = resolveTraceId(payload.traceId);
  const enrichedPayload: WhatsAppTemplateJob = { ...payload, traceId };

  const jobOpts: JobsOptions = { jobId };
  if (options?.delay) jobOpts.delay = options.delay;

  try {
    await queue.add(WHATSAPP_JOB_NAMES.SEND_TEMPLATE, enrichedPayload, jobOpts);
    logger.info('[enqueue:whatsapp] template queued', {
      jobId,
      traceId,
      template: payload.templateName,
      userId: payload.userId,
    });
    return { ok: true, jobId, traceId };
  } catch (err) {
    logger.error('[enqueue:whatsapp] failed', {
      error: (err as Error).message,
      jobId,
      traceId,
    });
    return { ok: false, reason: (err as Error).message, traceId };
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
  const traceId = resolveTraceId(payload.traceId);
  const enrichedPayload: WhatsAppTextJob = { ...payload, traceId };

  try {
    await queue.add(WHATSAPP_JOB_NAMES.SEND_TEXT, enrichedPayload, { jobId });
    return { ok: true, jobId, traceId };
  } catch (err) {
    logger.error('[enqueue:whatsapp:text] failed', {
      error: (err as Error).message,
      traceId,
    });
    return { ok: false, reason: (err as Error).message, traceId };
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
  const traceId = resolveTraceId(payload.traceId);
  const enrichedPayload: EmailTemplatedJob = { ...payload, traceId };

  const jobOpts: JobsOptions = { jobId };
  if (options?.delay) jobOpts.delay = options.delay;

  try {
    await queue.add(EMAIL_JOB_NAMES.SEND_TEMPLATED, enrichedPayload, jobOpts);
    logger.info('[enqueue:email] templated queued', {
      jobId,
      traceId,
      template: payload.template,
    });
    return { ok: true, jobId, traceId };
  } catch (err) {
    logger.error('[enqueue:email] failed', {
      error: (err as Error).message,
      jobId,
      traceId,
    });
    return { ok: false, reason: (err as Error).message, traceId };
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
  const traceId = resolveTraceId(payload.traceId);
  const enrichedPayload: EmailRawJob = { ...payload, traceId };

  try {
    await queue.add(EMAIL_JOB_NAMES.SEND_RAW, enrichedPayload, { jobId });
    return { ok: true, jobId, traceId };
  } catch (err) {
    logger.error('[enqueue:email:raw] failed', {
      error: (err as Error).message,
      traceId,
    });
    return { ok: false, reason: (err as Error).message, traceId };
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
  const traceId = resolveTraceId(payload.traceId);
  const enrichedPayload: ConsultationPdfJob = { ...payload, traceId };

  try {
    await queue.add(PDF_JOB_NAMES.CONSULTATION_REPORT, enrichedPayload, { jobId });
    logger.info('[enqueue:pdf] consultation report queued', {
      jobId,
      traceId,
      consultationId: payload.consultationId,
    });
    return { ok: true, jobId, traceId };
  } catch (err) {
    logger.error('[enqueue:pdf] failed', {
      error: (err as Error).message,
      jobId,
      traceId,
    });
    return { ok: false, reason: (err as Error).message, traceId };
  }
}

// ═══════════════════════════════════════════════════════════════
// MEDIA PROCESSING PRODUCER — Task #46
// ═══════════════════════════════════════════════════════════════

/**
 * Enqueue the worker pipeline for a freshly-uploaded MediaAsset.
 * Called from `media.service.confirmUpload` after the client confirms
 * a successful R2 direct upload.
 *
 * Idempotent: same mediaId → same jobId → BullMQ refuses duplicates.
 * Safe to call in the rare case the API retries the confirm step.
 */
export async function enqueueMediaProcessing(
  payload: Omit<MediaProcessingJob, 'traceId'>,
): Promise<EnqueueResult> {
  const queue = getQueue(QUEUE_NAMES.MEDIA_PROCESSING);
  if (!queue) {
    logger.warn('[enqueue:media] queue not configured — media processing deferred');
    return { ok: false, reason: 'queue not configured' };
  }

  const jobId = buildMediaProcessingJobId(payload.mediaId);
  const traceId = resolveTraceId();
  const enriched: MediaProcessingJob = { ...payload, traceId };

  try {
    await queue.add(MEDIA_JOB_NAMES.PROCESS_MEDIA, enriched, { jobId });
    logger.info('[enqueue:media] processing queued', {
      jobId,
      traceId,
      mediaId: payload.mediaId,
      kind: payload.kind,
    });
    return { ok: true, jobId, traceId };
  } catch (err) {
    logger.error('[enqueue:media] failed', {
      error: (err as Error).message,
      jobId,
      traceId,
    });
    return { ok: false, reason: (err as Error).message, traceId };
  }
}
