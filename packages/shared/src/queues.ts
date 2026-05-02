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
}

export interface WhatsAppTextJob {
  phone: string;
  body: string;
  userId?: string;
  consultationId?: string;
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
}

export interface EmailRawJob {
  to: string;
  subject: string;
  html: string;
  from?: string;
  template?: string;
  userId?: string;
  consultationId?: string;
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
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULED QUEUE — Cron-equivalent + delayed jobs
// ═══════════════════════════════════════════════════════════════

export const SCHEDULED_JOB_NAMES = {
  FOLLOWUP_3DAY: 'followup-3day',
  FOLLOWUP_7DAY: 'followup-7day',
  DAILY_REPORT: 'daily-report',
  WHATSAPP_HEARTBEAT: 'whatsapp-heartbeat',
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
} as const;
