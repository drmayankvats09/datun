// ═══════════════════════════════════════════════════════════════
// ENV CONFIG — Validated at boot, crash-early if misconfigured
// Source of truth for all environment variables.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // ── Auth (own system — NO Auth0) ──
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters')
    .optional(),

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

  // ── WhatsApp (Meta Cloud API) ──
  WHATSAPP_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),

  // ── Meta App (for WhatsApp Cloud API auth) ──
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),

  // ── Resend ──
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_DOMAIN: z.string().default('datunai.com'),
  ALERT_EMAIL_TO: z.string().email().default('hello@datunai.com'),

  // ── AWS SES (fallback email provider) ──
  AWS_SES_ACCESS_KEY: z.string().optional(),
  AWS_SES_SECRET_KEY: z.string().optional(),
  AWS_SES_REGION: z.string().default('ap-south-1'),

  // ── Better Stack ──
  LOGTAIL_SOURCE_TOKEN: z.string().optional(),

  // ── Healthchecks.io ──
  HEALTHCHECK_3DAY_URL: z.string().optional(),
  HEALTHCHECK_7DAY_URL: z.string().optional(),
  HEALTHCHECK_WHATSAPP_URL: z.string().optional(),
  HEALTHCHECK_DAILY_REPORT_URL: z.string().optional(),
});

const refinedSchema = envSchema.superRefine((data, ctx) => {
  // WhatsApp: all required vars when enabled
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
    if (!data.WHATSAPP_BUSINESS_ACCOUNT_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'WHATSAPP_BUSINESS_ACCOUNT_ID required when WHATSAPP_ENABLED=true',
        path: ['WHATSAPP_BUSINESS_ACCOUNT_ID'],
      });
    }
  }
  // Google OAuth: both ID + secret required together
  if (data.GOOGLE_CLIENT_ID && !data.GOOGLE_CLIENT_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'GOOGLE_CLIENT_SECRET required when GOOGLE_CLIENT_ID is set',
      path: ['GOOGLE_CLIENT_SECRET'],
    });
  }
  // MSG91: both key + template required together
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
  // P1-F18: Resend API key required if custom alert email
  if (data.ALERT_EMAIL_TO !== 'hello@datunai.com' && !data.RESEND_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'RESEND_API_KEY required when custom ALERT_EMAIL_TO is set',
      path: ['RESEND_API_KEY'],
    });
  }
  // Meta App: secret required if app ID set
  if (data.META_APP_ID && !data.META_APP_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'META_APP_SECRET required when META_APP_ID is set',
      path: ['META_APP_SECRET'],
    });
  }
  // Production warning: JWT_REFRESH_SECRET should be set
  if (data.NODE_ENV === 'production' && !data.JWT_REFRESH_SECRET) {
    console.warn(
      '⚠️ JWT_REFRESH_SECRET not set — falling back to JWT_SECRET for refresh tokens. Set a separate secret in production.',
    );
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
