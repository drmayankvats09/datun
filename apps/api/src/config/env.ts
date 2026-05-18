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

  // ── Queue Redis (Railway TCP — for BullMQ) ──
  QUEUE_REDIS_URL: z.string().url().optional(),

  // ── Bull-board dashboard auth ──
  BULL_BOARD_USER: z.string().min(1).default('admin'),
  BULL_BOARD_PASSWORD: z.string().min(8).optional(),

  // ── Feature flag: cron migration ──
  CRON_BACKEND: z.enum(['node-cron', 'bullmq']).default('node-cron'),

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

  // ── Gupshup (WhatsApp fallback provider) ──
  GUPSHUP_API_KEY: z.string().optional(),
  GUPSHUP_APP_NAME: z.string().optional(),
  GUPSHUP_SOURCE_NUMBER: z.string().optional(),
  GUPSHUP_WEBHOOK_SECRET: z.string().optional(),

  // ── AiSensy (WhatsApp emergency provider — Year 2) ──
  AISENSY_API_KEY: z.string().optional(),

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

  // ── CSP — Task #45 ──
  // Salt for SHA-256 hashing of IP addresses before persisting CSP violations.
  // DPDP compliance: raw IPs MUST NOT be stored. Hash(ip || salt) is stored instead.
  // Minimum 32 chars (64 recommended). Generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  // Rotate quarterly. Production: REQUIRED. Dev/test: optional (falls back to dev default).
  CSP_IP_HASH_SALT: z
    .string()
    .min(32, 'CSP_IP_HASH_SALT must be at least 32 characters')
    .optional(),

  // ── Task #46: Storage provider selection ──
  /**
   * Which {@link StorageProvider} is the active origin.
   * 'r2' is the day-one default. 'cloudinary' is the documented fallback
   * adapter for sustained-outage scenarios (memory rule #27).
   */
  STORAGE_PROVIDER_PRIMARY: z.enum(['r2', 'cloudinary']).default('r2'),

  // ── Task #46: Cloudflare R2 (origin storage, S3-compatible) ──
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_PRIVATE: z.string().default('datun-media-prod-private'),
  R2_BUCKET_PUBLIC: z.string().default('datun-media-prod-public'),
  /**
   * Public R2 hostname for assets in the public bucket (configured as a
   * custom domain like `media.datunai.com` in the Cloudflare dashboard,
   * or the default `<account>.r2.dev`).
   */
  R2_PUBLIC_HOSTNAME: z.string().optional(),

  // ── Task #46: Cloudflare Images (delivery / variants) ──
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_ACCOUNT_HASH: z.string().optional(),
  CLOUDFLARE_IMAGES_API_TOKEN: z.string().optional(),
  /**
   * Optional HMAC signing key for Cloudflare Images private variant URLs
   * (Pro tier feature). When set, the delivery provider mints signed URLs
   * with `exp` + `sig` query params for clinical assets. When unset, the
   * provider falls back to app-layer auth gating (documented in ADR-0006).
   */
  CLOUDFLARE_IMAGES_SIGNING_KEY: z.string().optional(),

  // ── Task #46: Cloudinary (fallback adapter only — usually unset) ──
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // ── Task #46: signed-URL TTLs (override defaults from constants) ──
  MEDIA_SIGNED_UPLOAD_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  MEDIA_SIGNED_READ_TTL_SECONDS: z.coerce.number().int().positive().default(300),
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
  if (data.UPSTASH_REDIS_REST_URL && !data.UPSTASH_REDIS_REST_TOKEN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'UPSTASH_REDIS_REST_TOKEN required when UPSTASH_REDIS_REST_URL is set',
      path: ['UPSTASH_REDIS_REST_TOKEN'],
    });
  }
  if (data.ALERT_EMAIL_TO !== 'hello@datunai.com' && !data.RESEND_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'RESEND_API_KEY required when custom ALERT_EMAIL_TO is set',
      path: ['RESEND_API_KEY'],
    });
  }
  if (data.META_APP_ID && !data.META_APP_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'META_APP_SECRET required when META_APP_ID is set',
      path: ['META_APP_SECRET'],
    });
  }
  if (data.NODE_ENV === 'production' && !data.QUEUE_REDIS_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'QUEUE_REDIS_URL required in production (Railway Redis TCP URL)',
      path: ['QUEUE_REDIS_URL'],
    });
  }
  if (data.NODE_ENV === 'production' && !data.BULL_BOARD_PASSWORD) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'BULL_BOARD_PASSWORD required in production',
      path: ['BULL_BOARD_PASSWORD'],
    });
  }
  // Task #45: Production REQUIRES a proper CSP IP hash salt (DPDP compliance).
  if (data.NODE_ENV === 'production' && !data.CSP_IP_HASH_SALT) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'CSP_IP_HASH_SALT required in production for DPDP-compliant IP hashing. Generate with: node -e "console.log(require(`crypto`).randomBytes(32).toString(`hex`))"',
      path: ['CSP_IP_HASH_SALT'],
    });
  }
  if (data.NODE_ENV === 'production' && !data.JWT_REFRESH_SECRET) {
    console.warn(
      '⚠️ JWT_REFRESH_SECRET not set — falling back to JWT_SECRET for refresh tokens. Set a separate secret in production.',
    );
  }

  // ── Task #46: media provider validation ──
  if (data.STORAGE_PROVIDER_PRIMARY === 'r2') {
    const r2Required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'] as const;
    for (const key of r2Required) {
      if (!data[key]) {
        // In production this is fatal; in dev/test we only warn so local
        // backends can boot without Cloudflare credentials.
        if (data.NODE_ENV === 'production') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} required when STORAGE_PROVIDER_PRIMARY=r2 in production`,
            path: [key],
          });
        }
      }
    }
  }
  if (data.STORAGE_PROVIDER_PRIMARY === 'cloudinary') {
    const cnRequired = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
    ] as const;
    for (const key of cnRequired) {
      if (!data[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} required when STORAGE_PROVIDER_PRIMARY=cloudinary`,
          path: [key],
        });
      }
    }
  }
  // Cloudflare Images is an OPTIONAL delivery layer for variant generation.
  // R2 origin (datun-media-prod-public bucket via media.datunai.com) serves
  // images directly without CF Images. CF Images can be enabled later via
  // CLOUDFLARE_ACCOUNT_HASH + CLOUDFLARE_IMAGES_API_TOKEN env vars when
  // volume justifies the $5/month subscription.
  // Memory rule: Task #46 ships in R2-only mode; CF Images dormant.
  // If account hash is set, token must also be set (defensive pair check).
  if (data.CLOUDFLARE_ACCOUNT_HASH && !data.CLOUDFLARE_IMAGES_API_TOKEN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'CLOUDFLARE_IMAGES_API_TOKEN required when CLOUDFLARE_ACCOUNT_HASH is set',
      path: ['CLOUDFLARE_IMAGES_API_TOKEN'],
    });
  }
  if (data.CLOUDFLARE_IMAGES_API_TOKEN && !data.CLOUDFLARE_ACCOUNT_HASH) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'CLOUDFLARE_ACCOUNT_HASH required when CLOUDFLARE_IMAGES_API_TOKEN is set',
      path: ['CLOUDFLARE_ACCOUNT_HASH'],
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
