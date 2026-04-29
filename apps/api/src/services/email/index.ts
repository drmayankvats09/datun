// ═══════════════════════════════════════════════════════════════
// EMAIL CLIENT — Multi-provider failover + DB logging
// REFACTORED (Task #40): uses generic lib/circuit-breaker.
// Public API unchanged — all existing email tests pass.
//
// Architecture:
//   Caller → emailClient.send(template, vars)
//   → Render template → HTML
//   → Try Provider 1 (Resend) → success? log + return
//   → Failed? → Try Provider 2 (SES)
//   → All failed? → log failure + return
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@repo/db';
import { logger } from '../../lib/logger.js';
import { Sentry } from '../../lib/sentry.js';
import { CircuitBreaker, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../../lib/circuit-breaker.js';
import { ResendProvider } from './resend.provider.js';
import { SesProvider } from './ses.provider.js';
import { renderEmailTemplate } from './templates.js';
import type {
  EmailProvider,
  EmailSendResult,
  EmailProviderHealth,
  EmailClientSendOptions,
} from './types.js';

// ── State ──
let providers: EmailProvider[] = [];
let breaker: CircuitBreaker<string> | null = null;
let initialized = false;

function initialize(): void {
  if (initialized) return;

  const candidates: EmailProvider[] = [new ResendProvider(), new SesProvider()];
  providers = candidates.filter((p) => p.isConfigured());
  breaker = new CircuitBreaker<string>(DEFAULT_CIRCUIT_BREAKER_CONFIG, '[EmailClient]');

  const activeNames = providers.map((p) => p.name);
  const inactiveNames = candidates.filter((p) => !p.isConfigured()).map((p) => p.name);

  logger.info('[EmailClient] Initialized', {
    activeProviders: activeNames,
    inactiveProviders: inactiveNames,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  });

  if (providers.length === 0) {
    logger.warn('[EmailClient] NO EMAIL PROVIDERS CONFIGURED — emails will be logged only');
  }

  initialized = true;
}

// ── Circuit Breaker (delegates to generic) ──

function isHealthy(providerName: string): boolean {
  return breaker?.isAvailable(providerName) ?? false;
}

function recordSuccess(providerName: string): void {
  breaker?.recordSuccess(providerName);
}

function recordFailure(providerName: string): void {
  breaker?.recordFailure(providerName);
}

// ── DB Logging ──

async function logEmailAttempt(
  options: EmailClientSendOptions,
  result: EmailSendResult,
  subject: string,
): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        to: options.to,
        template: options.template,
        subject,
        provider: result.provider,
        status: result.success ? 'SENT' : 'FAILED',
        providerMessageId: result.providerMessageId ?? null,
        error: result.errorMessage ?? null,
        userId: options.userId ?? null,
        consultationId: options.consultationId ?? null,
        metadata: options.vars ? JSON.parse(JSON.stringify(options.vars)) : undefined,
      },
    });
  } catch (err) {
    // DB logging failure should NEVER block email delivery
    logger.error('[EmailClient] DB log failed (non-blocking)', {
      error: (err as Error).message,
    });
  }
}

// ── Public API ──

/**
 * Send an email using the template system.
 *
 * @example
 * ```ts
 * await emailClient.send({
 *   to: 'patient@gmail.com',
 *   template: 'otp',
 *   vars: { code: '123456' },
 *   locale: 'hi',
 *   userId: user.id,
 * });
 * ```
 */
async function send(options: EmailClientSendOptions): Promise<EmailSendResult> {
  initialize();

  // 1. Render template → subject + HTML
  const { subject, html } = renderEmailTemplate(
    options.template,
    options.vars,
    options.locale ?? 'en',
  );

  // 2. Try each healthy provider in order
  let lastResult: EmailSendResult = {
    success: false,
    provider: 'none',
    errorMessage: 'No email providers configured',
  };

  for (const provider of providers) {
    if (!isHealthy(provider.name)) {
      logger.debug(`[EmailClient] Skipping ${provider.name} (unhealthy)`);
      continue;
    }

    const result = await provider.send({
      to: options.to,
      subject,
      html,
      template: options.template,
    });

    if (result.success) {
      recordSuccess(provider.name);
      await logEmailAttempt(options, result, subject);

      logger.info('[EmailClient] Email sent', {
        to: options.to,
        template: options.template,
        provider: provider.name,
        messageId: result.providerMessageId,
      });

      return result;
    }

    // Failed — record and try next provider
    recordFailure(provider.name);
    lastResult = result;

    logger.warn(`[EmailClient] Provider ${provider.name} failed, trying next`, {
      error: result.errorMessage,
      to: options.to,
      template: options.template,
    });
  }

  // All providers failed
  await logEmailAttempt(options, lastResult, subject);
  Sentry.captureMessage(
    `[EmailClient] All providers failed for ${options.template} to ${options.to}`,
    'error',
  );

  logger.error('[EmailClient] ALL PROVIDERS FAILED', {
    to: options.to,
    template: options.template,
    lastError: lastResult.errorMessage,
  });

  return lastResult;
}

/**
 * Send a raw email (no template rendering).
 * Used by: alertAdmin, daily report — they render their own HTML.
 */
async function sendRaw(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  template?: string;
}): Promise<EmailSendResult> {
  initialize();

  let lastResult: EmailSendResult = {
    success: false,
    provider: 'none',
    errorMessage: 'No email providers configured',
  };

  for (const provider of providers) {
    if (!isHealthy(provider.name)) continue;

    const result = await provider.send({
      to: options.to,
      subject: options.subject,
      html: options.html,
      from: options.from,
    });

    if (result.success) {
      recordSuccess(provider.name);
      logger.info('[EmailClient] Raw email sent', {
        to: options.to,
        subject: options.subject,
        provider: provider.name,
      });
      return result;
    }

    recordFailure(provider.name);
    lastResult = result;
  }

  return lastResult;
}

/**
 * Get health status of all providers (preserves EmailProviderHealth shape
 * so existing tests pass without changes).
 */
function getHealth(): Record<string, EmailProviderHealth> {
  initialize();
  if (!breaker) return {};
  const states = breaker.getAllHealth();
  const result: Record<string, EmailProviderHealth> = {};
  for (const [name, s] of Object.entries(states)) {
    result[name] = {
      status: s.status === 'degraded' ? 'healthy' : (s.status as 'healthy' | 'unhealthy'),
      consecutiveFailures: s.consecutiveFailures,
      lastSuccessAt: s.lastSuccessAt,
      lastFailureAt: s.lastFailureAt,
      unhealthyUntil: s.unhealthyUntil,
      totalSent: s.totalRequests,
      totalFailed: s.totalFailures,
    };
  }
  return result;
}

export const emailClient = {
  send,
  sendRaw,
  getHealth,
};
