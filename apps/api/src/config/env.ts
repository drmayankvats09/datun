// ═══════════════════════════════════════════════════════════════
// ENV CONFIG — Validated at boot, crash-early if misconfigured
// Feature flags for optional services prevent silent failures.
// Pattern: Google Cloud, Stripe, Vercel — all validate env at startup.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

const envSchema = z.object({
  // ── Core ──
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // ── Auth0 ──
  AUTH0_DOMAIN: z.string().min(1, 'AUTH0_DOMAIN is required'),
  AUTH0_AUDIENCE: z.string().min(1, 'AUTH0_AUDIENCE is required'),

  // ── AI ──
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  AI_PRIMARY_MODEL: z.string().default('claude-sonnet-4-20250514'),
  AI_FALLBACK_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  OPENAI_API_KEY: z.string().optional(), // ← ADD THIS LINE
  GEMINI_API_KEY: z.string().optional(), // ← ADD THIS LINE

  // ── Sentry (optional in dev) ──
  SENTRY_DSN: z.string().optional(),

  // ── WhatsApp (feature-flagged) ──
  WHATSAPP_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),

  // ── Resend (email alerts) ──
  RESEND_API_KEY: z.string().optional(),
  ALERT_EMAIL_TO: z.string().email().default('hello@datunai.com'),

  // ── Better Stack ──
  LOGTAIL_SOURCE_TOKEN: z.string().optional(),

  // ── Healthchecks.io ──
  HEALTHCHECK_3DAY_URL: z.string().optional(),
  HEALTHCHECK_7DAY_URL: z.string().optional(),
  HEALTHCHECK_WHATSAPP_URL: z.string().optional(),
  HEALTHCHECK_DAILY_REPORT_URL: z.string().optional(),
});

// Post-parse validation: if WhatsApp enabled, token + phone ID required
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
