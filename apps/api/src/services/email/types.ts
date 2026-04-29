// ═══════════════════════════════════════════════════════════════
// EMAIL PROVIDER TYPES — Multi-provider abstraction layer
// Pattern mirrors: ai/types.ts (AI providers), whatsapp/types.ts
// Provider swap = zero caller code changes.
//
// Used by: resend.provider.ts, ses.provider.ts, email/index.ts
// Pattern: Stripe multi-sender, Vercel email infrastructure.
// ═══════════════════════════════════════════════════════════════

// ── Template Names (single source of truth) ──

/**
 * All registered email template names.
 * Adding a new template? Add it here FIRST → TypeScript enforces everywhere.
 */
export type EmailTemplateName =
  | 'otp'
  | 'welcome'
  | 'consultation_complete'
  | 'follow_up_3day'
  | 'follow_up_7day'
  | 'password_reset'
  | 'security_alert'
  | 'clinic_welcome'
  | 'clinic_lead'
  | 'payment_receipt'
  | 'admin_alert'
  | 'daily_report';

// ── Send Options ──

export interface EmailSendOptions {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** Rendered HTML body */
  html: string;
  /** Sender address (default: system@datunai.com) */
  from?: string;
  /** Reply-to address */
  replyTo?: string;
  /** Template name for logging/analytics */
  template?: EmailTemplateName;
  /** Optional tags for Resend/SES tracking */
  tags?: Array<{ name: string; value: string }>;
}

// ── Send Result ──

export interface EmailSendResult {
  /** Whether the email was accepted for delivery */
  success: boolean;
  /** Provider's message ID for tracking */
  providerMessageId?: string;
  /** Which provider handled this */
  provider: string;
  /** Error details if failed */
  errorMessage?: string;
  /** Error code from provider */
  errorCode?: string;
}

// ── Provider Interface ──

export interface EmailProvider {
  /** Unique provider identifier */
  readonly name: string;

  /** Whether this provider is configured (has API key / credentials) */
  isConfigured(): boolean;

  /** Send an email */
  send(options: EmailSendOptions): Promise<EmailSendResult>;

  /** Check if provider API is reachable */
  healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

// ── Circuit Breaker Config ──

export interface EmailClientConfig {
  /** Failures before marking provider unhealthy (default: 3) */
  circuitBreakerThreshold: number;
  /** Window for counting failures in ms (default: 60000 = 1 min) */
  circuitBreakerWindowMs: number;
  /** Cooldown before retrying unhealthy provider in ms (default: 300000 = 5 min) */
  circuitBreakerCooldownMs: number;
}

// ── Provider Health ──

export interface EmailProviderHealth {
  status: 'healthy' | 'unhealthy';
  consecutiveFailures: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  unhealthyUntil: number | null;
  totalSent: number;
  totalFailed: number;
}

// ── High-level send function (used by all callers) ──

export interface EmailClientSendOptions {
  /** Recipient email */
  to: string;
  /** Template name — determines subject + HTML body */
  template: EmailTemplateName;
  /** Template variables (passed to template renderer) */
  vars: Record<string, unknown>;
  /** Optional locale for i18n (default: 'en') */
  locale?: string;
  /** Optional user ID for DB logging */
  userId?: string;
  /** Optional consultation ID for DB logging */
  consultationId?: string;
}
