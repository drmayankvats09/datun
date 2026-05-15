// ═══════════════════════════════════════════════════════════════
// JOB ID BUILDERS — Idempotency keys for queue jobs
//
// Why this matters CRITICALLY for Datun:
//   - Same WhatsApp template sent twice = duplicate message to patient
//   - Same email = patient confusion + DPDP "unwanted communication"
//   - Same PDF generated twice = wasted Cloudinary credits
//
// BullMQ uses jobId for dedup — same jobId = same job, no duplicate work.
// Pattern: Stripe idempotency keys, every webhook delivery has unique ID.
// ═══════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto';

/**
 * Stable hash for job IDs containing user input.
 * Truncated to 16 chars for readable but unique IDs.
 */
function shortHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/**
 * WhatsApp template job ID — unique per (user, template, consultation).
 * Same template to same user for same consultation = same jobId = dedup.
 *
 * Example: wa-tpl:user-abc:consultation_complete:cons-xyz
 */
export function buildWhatsAppTemplateJobId(args: {
  userId: string;
  templateName: string;
  consultationId?: string;
  /** Salt for jobs that legitimately repeat (e.g., 3day vs 7day followup) */
  salt?: string;
}): string {
  const parts = [
    'wa-tpl',
    args.userId,
    args.templateName,
    args.consultationId ?? 'noconsult',
    args.salt ?? '',
  ].filter(Boolean);
  return parts.join(':');
}

/**
 * WhatsApp text job ID — unique per (user, text-hash, time-bucket).
 * Time bucket = 1 hour to allow legitimate "same text" later but block accidental retries.
 */
export function buildWhatsAppTextJobId(args: {
  phone: string;
  body: string;
  bucketMs?: number;
}): string {
  const bucket = Math.floor(Date.now() / (args.bucketMs ?? 3_600_000));
  return `wa-txt:${args.phone}:${shortHash(args.body)}:${bucket}`;
}

/**
 * Email templated job ID — unique per (recipient, template, consultation).
 */
export function buildEmailTemplatedJobId(args: {
  to: string;
  template: string;
  consultationId?: string;
  salt?: string;
}): string {
  return [
    'email-tpl',
    shortHash(args.to.toLowerCase()),
    args.template,
    args.consultationId ?? 'noconsult',
    args.salt ?? '',
  ]
    .filter(Boolean)
    .join(':');
}

/**
 * Email raw job ID — unique per (recipient, subject-hash, time-bucket).
 */
export function buildEmailRawJobId(args: {
  to: string;
  subject: string;
  bucketMs?: number;
}): string {
  const bucket = Math.floor(Date.now() / (args.bucketMs ?? 3_600_000));
  return `email-raw:${shortHash(args.to)}:${shortHash(args.subject)}:${bucket}`;
}

/**
 * PDF consultation report job ID — one PDF per consultation.
 * Same consultation = same jobId = no regeneration unless explicit force.
 */
export function buildPdfConsultationJobId(consultationId: string): string {
  return `pdf-cons:${consultationId}`;
}

/**
 * Scheduled job IDs use date stamps — same date = same job.
 * Prevents duplicate cron runs if 2 instances briefly overlap.
 */
export function buildScheduledJobId(args: {
  jobName: string;
  /** ISO date YYYY-MM-DD for daily jobs, YYYY-MM-DD-HH for hourly */
  bucket: string;
}): string {
  return `sched:${args.jobName}:${args.bucket}`;
}

/**
 * Media processing job ID — one job per MediaAsset, ever. Same mediaId
 * = same jobId = BullMQ refuses duplicate enqueue. Idempotency Day 1.
 */
export function buildMediaProcessingJobId(mediaId: string): string {
  return `media-proc:${mediaId}`;
}
