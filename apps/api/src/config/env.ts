// ═══════════════════════════════════════════════════════════════
// ENV CONFIG — Validated at boot, crash-early if misconfigured
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // ── Auth (own system — NO Auth0) ──
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // ── Google OAuth (optional) ──
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // ── MSG91 SMS OTP (optional) ──
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),

  // ── Redis (Upstash — optional, falls back to in-memory) ──
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ── AI ──
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  AI_PRIMARY_MODEL: z.string().default('claude-sonnet-4-20250514'),
  AI_FALLBACK_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // ── Sentry ──
  SENTRY_DSN: z.string().optional(),

  // ── WhatsApp ──
  WHATSAPP_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),

  // ── Resend ──
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_DOMAIN: z.string().default('datunai.com'),
  ALERT_EMAIL_TO: z.string().email().default('hello@datunai.com'),

  // ── Better Stack ──
  LOGTAIL_SOURCE_TOKEN: z.string().optional(),

  // ── Healthchecks.io ──
  HEALTHCHECK_3DAY_URL: z.string().optional(),
  HEALTHCHECK_7DAY_URL: z.string().optional(),
  HEALTHCHECK_WHATSAPP_URL: z.string().optional(),
  HEALTHCHECK_DAILY_REPORT_URL: z.string().optional(),
});

const refinedSchema = envSchema.superRefine((data, ctx) => {
  if (data.WHATSAPP_ENABLED) {
    if (!data.WHATSAPP_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'WHATSAPP_TOKEN required when WHATSAPP_ENABLED=true',
        path: ['WHATSAPP_TOKEN'],
      });
    }
    if (!data.WHATSAPP_PHONE_NUMBER_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'WHATSAPP_PHONE_NUMBER_ID required when WHATSAPP_ENABLED=true',
        path: ['WHATSAPP_PHONE_NUMBER_ID'],
      });
    }
  }
  if (data.GOOGLE_CLIENT_ID && !data.GOOGLE_CLIENT_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'GOOGLE_CLIENT_SECRET required when GOOGLE_CLIENT_ID is set',
      path: ['GOOGLE_CLIENT_SECRET'],
    });
  }
  if (data.MSG91_AUTH_KEY && !data.MSG91_TEMPLATE_ID) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'MSG91_TEMPLATE_ID required when MSG91_AUTH_KEY is set',
      path: ['MSG91_TEMPLATE_ID'],
    });
  }
  // Redis: both URL and token required together
  if (data.UPSTASH_REDIS_REST_URL && !data.UPSTASH_REDIS_REST_TOKEN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'UPSTASH_REDIS_REST_TOKEN required when UPSTASH_REDIS_REST_URL is set',
      path: ['UPSTASH_REDIS_REST_TOKEN'],
    });
  }
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = refinedSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
