// ═══════════════════════════════════════════════════════════════
// QUEUE CONTRACT — Single source of truth for queue names + job payloads
// Both API (producer) and worker (consumer) import from here.
// Adding a new queue/job? Add type here FIRST → TS enforces both sides.
//
// Pattern: Linear's @linear/contracts, Stripe internal queue typings
// ═══════════════════════════════════════════════════════════════

// ── Queue names (constants, not enums — better tree-shaking) ──

export const QUEUE_NAMES = {
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  PDF: 'pdf',
  SCHEDULED: 'scheduled',
  // Wave 10 — Outbox pattern (Task #43 wiring)
  OUTBOX_RELAY: 'outbox-relay',
  OUTBOX_DLQ_REPLAY: 'outbox-dlq-replay',
  // Wave 8 — Data quality (Task #43 wiring)
  DATA_QUALITY: 'data-quality',
  // Wave 12 — Continuous training (Task #43 wiring)
  DRIFT_CHECK: 'drift-check',
  SHADOW_COMPARE: 'shadow-compare',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ═══════════════════════════════════════════════════════════════
// WHATSAPP QUEUE — Job names + payloads
// ═══════════════════════════════════════════════════════════════

export const WHATSAPP_JOB_NAMES = {
  SEND_TEMPLATE: 'send-template',
  SEND_TEXT: 'send-text',
} as const;

export type WhatsAppJobName = (typeof WHATSAPP_JOB_NAMES)[keyof typeof WHATSAPP_JOB_NAMES];

/** Phone numbers must be E.164 normalized BEFORE enqueue (workers don't normalize) */
export interface WhatsAppTemplateJob {
  phone: string;
  templateName: string;
  components?: unknown[]; // TemplateComponent[] from api package — keep typed loose here
  userId?: string;
  consultationId?: string;
  traceId?: string;
}

export interface WhatsAppTextJob {
  phone: string;
  body: string;
  userId?: string;
  consultationId?: string;
  traceId?: string;
}

// ═══════════════════════════════════════════════════════════════
// EMAIL QUEUE — Job names + payloads
// ═══════════════════════════════════════════════════════════════

export const EMAIL_JOB_NAMES = {
  SEND_TEMPLATED: 'send-templated',
  SEND_RAW: 'send-raw',
} as const;

export type EmailJobName = (typeof EMAIL_JOB_NAMES)[keyof typeof EMAIL_JOB_NAMES];

export interface EmailTemplatedJob {
  to: string;
  template: string;
  vars: Record<string, string | number | boolean>;
  locale?: string;
  userId?: string;
  consultationId?: string;
  traceId?: string;
}

export interface EmailRawJob {
  to: string;
  subject: string;
  html: string;
  from?: string;
  template?: string;
  userId?: string;
  consultationId?: string;
  traceId?: string;
}

// ═══════════════════════════════════════════════════════════════
// PDF QUEUE — Job names + payloads
// ═══════════════════════════════════════════════════════════════

export const PDF_JOB_NAMES = {
  CONSULTATION_REPORT: 'consultation-report',
} as const;

export type PdfJobName = (typeof PDF_JOB_NAMES)[keyof typeof PDF_JOB_NAMES];

export interface ConsultationPdfJob {
  consultationId: string;
  userId: string;
  /** Locale for PDF rendering — patient's preferred language */
  locale: string;
  traceId?: string;
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULED QUEUE — Cron-equivalent + delayed jobs
// ═══════════════════════════════════════════════════════════════

export const SCHEDULED_JOB_NAMES = {
  FOLLOWUP_3DAY: 'followup-3day',
  FOLLOWUP_7DAY: 'followup-7day',
  DAILY_REPORT: 'daily-report',
  WHATSAPP_HEARTBEAT: 'whatsapp-heartbeat',
  // Phase G additions (Task #43 production wiring)
  OUTBOX_RELAY_TICK: 'outbox-relay-tick',
  DATA_QUALITY_DAILY: 'data-quality-daily',
  DRIFT_CHECK_HOURLY: 'drift-check-hourly',
  SHADOW_COMPARE_DAILY: 'shadow-compare-daily',
} as const;

export type ScheduledJobName = (typeof SCHEDULED_JOB_NAMES)[keyof typeof SCHEDULED_JOB_NAMES];

/** Scheduled jobs use empty payload — they query DB themselves */
export type ScheduledJob = Record<string, never>;

// ═══════════════════════════════════════════════════════════════
// JOB OPTION DEFAULTS — Per-queue defaults
// ═══════════════════════════════════════════════════════════════

/**
 * Default job options by queue. Caller can override per .add() call.
 *
 * Conventions:
 * - removeOnComplete: keep last N successful for debug, delete older
 * - removeOnFail: keep last N failed for ops debugging
 * - attempts: max retry count (memory rule + PDF spec: max 5 retries)
 * - backoff exponential: 2s → 4s → 8s → 16s → 32s
 */
export const QUEUE_DEFAULTS = {
  whatsapp: {
    attempts: 5,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: { count: 1000, age: 24 * 60 * 60 },
    removeOnFail: { count: 5000, age: 7 * 24 * 60 * 60 },
  },
  email: {
    attempts: 5,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: { count: 1000, age: 24 * 60 * 60 },
    removeOnFail: { count: 5000, age: 7 * 24 * 60 * 60 },
  },
  pdf: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
    removeOnComplete: { count: 500, age: 24 * 60 * 60 },
    removeOnFail: { count: 2000, age: 7 * 24 * 60 * 60 },
  },
  scheduled: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 30_000 },
    removeOnComplete: { count: 100, age: 7 * 24 * 60 * 60 },
    removeOnFail: { count: 1000, age: 30 * 24 * 60 * 60 },
  },
  [QUEUE_NAMES.OUTBOX_RELAY]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 1_000 },
    removeOnFail: { count: 5_000 },
  },
  [QUEUE_NAMES.OUTBOX_DLQ_REPLAY]: {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
  [QUEUE_NAMES.DATA_QUALITY]: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: { count: 30 }, // keep 30 days
    removeOnFail: { count: 30 },
  },
  [QUEUE_NAMES.DRIFT_CHECK]: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: { count: 168 }, // keep 7 days hourly
    removeOnFail: { count: 168 },
  },
  [QUEUE_NAMES.SHADOW_COMPARE]: {
    attempts: 1,
    removeOnComplete: { count: 30 },
    removeOnFail: { count: 60 },
  },
} as const;

/**
 * Worker rate limiters — applied at WORKER level, not queue level.
 * BullMQ limiter is per-worker; if N workers, total = limiter × N.
 *
 * Calibrations (5-year safe headroom):
 *   - whatsapp: Meta Cloud API = 80 msg/sec hard limit. Set 50/sec to leave
 *     headroom for retries within window.
 *   - email: Resend free = 2/sec; paid = 10/sec. Conservative 5/sec stays
 *     safe across plan upgrades.
 *   - pdf: CPU-bound; 2/sec prevents memory blowup on Cloudinary upload chain.
 *   - scheduled: cron-equivalent; no real throughput need, 1/sec.
 *
 * Pattern: BullMQ docs official limiter pattern, Stripe internal queue config.
 */
export const WORKER_LIMITERS = {
  whatsapp: { max: 50, duration: 1000 },
  email: { max: 5, duration: 1000 },
  pdf: { max: 2, duration: 1000 },
  scheduled: { max: 1, duration: 1000 },
  // Phase G additions
  'outbox-relay': { max: 20, duration: 1000 }, // 20/sec — paced by publishers anyway
  'outbox-dlq-replay': { max: 1, duration: 1000 }, // serial DLQ replay
  'data-quality': { max: 1, duration: 1000 }, // single concurrent run
  'drift-check': { max: 1, duration: 1000 },
  'shadow-compare': { max: 1, duration: 1000 },
} as const;
// Worker concurrency per queue (Phase G additions)
export const WORKER_CONCURRENCY: Record<string, number> = {
  [QUEUE_NAMES.WHATSAPP]: 10,
  [QUEUE_NAMES.EMAIL]: 5,
  [QUEUE_NAMES.PDF]: 2,
  [QUEUE_NAMES.SCHEDULED]: 1,
  [QUEUE_NAMES.OUTBOX_RELAY]: 5,
  [QUEUE_NAMES.OUTBOX_DLQ_REPLAY]: 1,
  [QUEUE_NAMES.DATA_QUALITY]: 1,
  [QUEUE_NAMES.DRIFT_CHECK]: 1,
  [QUEUE_NAMES.SHADOW_COMPARE]: 1,
};
