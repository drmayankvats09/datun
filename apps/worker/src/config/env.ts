// ═══════════════════════════════════════════════════════════════
// WORKER ENV — Subset of API env, validated at boot
//
// Worker needs:
//   - QUEUE_REDIS_URL (mandatory — workers don't run without queue)
//   - DATABASE_URL (for JobLog audit + queries)
//   - All provider keys (Resend, Meta WA, etc) — workers actually do the work
//   - Sentry, Logtail, Healthchecks
//
// Worker does NOT need:
//   - JWT secrets, OAuth keys (no HTTP server)
//   - Bull-board credentials (dashboard runs on API)
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  QUEUE_REDIS_URL: z.string().url('QUEUE_REDIS_URL is required for worker'),

  // Worker concurrency (per-queue parallelism)
  // Tune higher for I/O-bound queues (whatsapp, email), lower for CPU (pdf)
  WORKER_CONCURRENCY_WHATSAPP: z.coerce.number().int().positive().default(10),
  WORKER_CONCURRENCY_EMAIL: z.coerce.number().int().positive().default(10),
  WORKER_CONCURRENCY_PDF: z.coerce.number().int().positive().default(2),
  WORKER_CONCURRENCY_SCHEDULED: z.coerce.number().int().positive().default(5),

  // ── AI ──
  ANTHROPIC_API_KEY: z.string().min(1),
  AI_PRIMARY_MODEL: z.string().default('claude-sonnet-4-20250514'),
  AI_FALLBACK_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // ── Sentry ──
  SENTRY_DSN: z.string().optional(),

  // ── WhatsApp Meta ──
  WHATSAPP_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),

  // ── WhatsApp Gupshup (fallback) ──
  GUPSHUP_API_KEY: z.string().optional(),
  GUPSHUP_APP_NAME: z.string().optional(),
  GUPSHUP_SOURCE_NUMBER: z.string().optional(),

  // ── AiSensy ──
  AISENSY_API_KEY: z.string().optional(),

  // ── Email (Resend + SES) ──
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_DOMAIN: z.string().default('datunai.com'),
  ALERT_EMAIL_TO: z.string().email().default('hello@datunai.com'),
  AWS_SES_ACCESS_KEY: z.string().optional(),
  AWS_SES_SECRET_KEY: z.string().optional(),
  AWS_SES_REGION: z.string().default('ap-south-1'),

  // ── Logging ──
  LOGTAIL_SOURCE_TOKEN: z.string().optional(),

  // ── Healthchecks.io (per-cron-equivalent URLs) ──
  HEALTHCHECK_3DAY_URL: z.string().optional(),
  HEALTHCHECK_7DAY_URL: z.string().optional(),
  HEALTHCHECK_WHATSAPP_URL: z.string().optional(),
  HEALTHCHECK_DAILY_REPORT_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid worker environment variables:');
    for (const issue of result.error.issues) {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
