// ═══════════════════════════════════════════════════════════════
// WHATSAPP CLIENT — Provider chain + circuit breaker + DB tracking
//
// Architecture (mirrors aiClient & emailClient):
//   Caller → sendWhatsAppText(to, body) | sendWhatsAppTemplate(...)
//   → 24hr window guard (text only)
//   → Try Provider 1 (Meta) → success? log + return
//   → Failed? Circuit breaker records, falls through to Provider 2
//   → Try Provider 2 (Gupshup) → success? log + return
//   → Failed? falls through to Provider 3
//   → Try Provider 3 (AiSensy) → final attempt
//   → All failed? Sentry alert + log + return failure
//
// Circuit breaker: 3 failures in 60s → unhealthy → 5 min cooldown → canary
// DB logging: every attempt → WhatsAppMessage row
//
// Window guard: text messages auto-rejected if 24hr window closed.
//               Caller should send template instead.
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@repo/db';
import { logger } from '../../lib/logger.js';
import { Sentry } from '../../lib/sentry.js';
import { env } from '../../config/env.js';
import { CircuitBreaker, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../../lib/circuit-breaker.js';
import { MetaWhatsAppProvider } from './meta.provider.js';
import { GupshupProvider } from './gupshup.provider.js';
import { AiSensyProvider } from './aisensy.provider.js';
import { isWindowOpen } from './window-tracker.js';
import { normalizeIndianPhone } from '../../utils/phone.js';
import type {
  WhatsAppProvider,
  WhatsAppProviderName,
  WhatsAppSendResult,
  TemplateComponent,
} from './types.js';

// ── State ──
let providers: WhatsAppProvider[] = [];
let breaker: CircuitBreaker<WhatsAppProviderName> | null = null;
let initialized = false;

function initialize(): void {
  if (initialized) return;

  const candidates: WhatsAppProvider[] = [];

  // Meta primary — only add if explicitly enabled (existing logic)
  if (env.WHATSAPP_ENABLED && env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
    candidates.push(new MetaWhatsAppProvider(env.WHATSAPP_TOKEN, env.WHATSAPP_PHONE_NUMBER_ID));
  }

  candidates.push(new GupshupProvider());
  candidates.push(new AiSensyProvider());

  providers = candidates.filter((p) => p.isConfigured());
  breaker = new CircuitBreaker<WhatsAppProviderName>(
    DEFAULT_CIRCUIT_BREAKER_CONFIG,
    '[WhatsAppClient]',
  );

  const activeNames = providers.map((p) => p.name);
  const inactiveNames = candidates.filter((p) => !p.isConfigured()).map((p) => p.name);

  logger.info('[WhatsAppClient] Initialized', {
    activeProviders: activeNames,
    inactiveProviders: inactiveNames,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  });

  if (providers.length === 0) {
    logger.warn('[WhatsAppClient] NO PROVIDERS CONFIGURED — sends will be no-ops');
  }

  initialized = true;
}

// ── Public API ──

/**
 * Send a text message (only works within 24hr customer service window).
 * If window is closed, returns failure with code WINDOW_CLOSED — caller
 * should send a template instead.
 */
export async function sendWhatsAppText(
  to: string,
  body: string,
  opts: { userId?: string; consultationId?: string; skipWindowCheck?: boolean } = {},
): Promise<WhatsAppSendResult> {
  initialize();

  const phone = normalizeIndianPhone(to);

  // 24-hour window guard (skip allowed for tests/admin)
  if (!opts.skipWindowCheck) {
    const windowOpen = await isWindowOpen(phone);
    if (!windowOpen) {
      logger.warn('[WhatsAppClient] Text rejected — 24hr window closed', { phone });
      return {
        success: false,
        provider: 'none',
        errorCode: 'WINDOW_CLOSED',
        errorMessage:
          'Customer service window closed (no inbound message in last 24h). Send a template instead.',
      };
    }
  }

  if (providers.length === 0) {
    return { success: false, provider: 'none', errorMessage: 'No providers configured' };
  }

  let lastResult: WhatsAppSendResult = {
    success: false,
    provider: 'none',
    errorMessage: 'No providers attempted',
  };

  for (const provider of providers) {
    if (!breaker!.isAvailable(provider.name)) {
      logger.debug(`[WhatsAppClient] Skipping ${provider.name} (circuit unhealthy)`);
      continue;
    }

    const result = await provider.sendText(phone, body);

    // Track in DB (fire-and-forget)
    void trackMessage({
      phone,
      templateName: '__text__',
      content: body,
      result,
      userId: opts.userId,
      consultationId: opts.consultationId,
    });

    if (result.success) {
      breaker!.recordSuccess(provider.name);
      logger.info('[WhatsAppClient] Text sent', {
        provider: provider.name,
        phone,
        messageId: result.providerMessageId,
      });
      return result;
    }

    breaker!.recordFailure(provider.name);
    lastResult = result;
    logger.warn(`[WhatsAppClient] ${provider.name} failed for text, trying next`, {
      error: result.errorMessage,
    });
  }

  // All providers failed
  Sentry.captureMessage('All WhatsApp providers failed for text', 'error');
  return {
    success: false,
    provider: 'all',
    errorMessage: lastResult.errorMessage ?? 'All WhatsApp providers failed',
  };
}

/**
 * Send a template message (works anytime — no window restriction).
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  components: TemplateComponent[],
  opts: { userId?: string; consultationId?: string } = {},
): Promise<WhatsAppSendResult> {
  initialize();

  const phone = normalizeIndianPhone(to);

  if (providers.length === 0) {
    return { success: false, provider: 'none', errorMessage: 'No providers configured' };
  }

  let lastResult: WhatsAppSendResult = {
    success: false,
    provider: 'none',
    errorMessage: 'No providers attempted',
  };

  for (const provider of providers) {
    if (!breaker!.isAvailable(provider.name)) {
      logger.debug(`[WhatsAppClient] Skipping ${provider.name} (circuit unhealthy)`);
      continue;
    }

    const result = await provider.sendTemplate(phone, templateName, components);

    void trackMessage({
      phone,
      templateName,
      content: JSON.stringify(components),
      result,
      userId: opts.userId,
      consultationId: opts.consultationId,
    });

    if (result.success) {
      breaker!.recordSuccess(provider.name);
      logger.info('[WhatsAppClient] Template sent', {
        provider: provider.name,
        phone,
        templateName,
        messageId: result.providerMessageId,
      });
      return result;
    }

    breaker!.recordFailure(provider.name);
    lastResult = result;
    logger.warn(`[WhatsAppClient] ${provider.name} failed for template, trying next`, {
      templateName,
      error: result.errorMessage,
    });
  }

  Sentry.captureMessage(`All WhatsApp providers failed for template: ${templateName}`, 'error');
  return {
    success: false,
    provider: 'all',
    errorMessage: lastResult.errorMessage ?? 'All WhatsApp providers failed',
  };
}

/**
 * Run health check on ALL configured providers (used by heartbeat cron).
 * Returns aggregate status + per-provider details.
 */
export async function whatsappHealthCheck(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
  providers: Array<{ name: WhatsAppProviderName; ok: boolean; latencyMs: number; error?: string }>;
}> {
  initialize();

  if (providers.length === 0) {
    return { ok: false, latencyMs: 0, error: 'No providers', providers: [] };
  }

  const start = Date.now();
  const results = await Promise.all(
    providers.map(async (p) => {
      const r = await p.healthCheck();
      return { name: p.name, ...r };
    }),
  );

  // Overall OK if at least one provider is healthy
  const anyHealthy = results.some((r) => r.ok);
  const primaryResult = results[0]!;

  return {
    ok: anyHealthy,
    latencyMs: Date.now() - start,
    ...(anyHealthy ? {} : { error: primaryResult.error ?? 'All providers down' }),
    providers: results,
  };
}

/**
 * Get circuit breaker health for all providers.
 * Used by admin dashboard / observability.
 */
export function getProviderHealth(): Record<
  string,
  ReturnType<NonNullable<typeof breaker>['getHealth']>
> {
  initialize();
  if (!breaker) return {};
  return breaker.getAllHealth();
}

// ── DB Tracking ──

async function trackMessage(data: {
  phone: string;
  templateName: string;
  content: string;
  result: WhatsAppSendResult;
  userId?: string;
  consultationId?: string;
}): Promise<void> {
  try {
    const providerEnum = mapProviderToEnum(data.result.provider);
    await prisma.whatsAppMessage.create({
      data: {
        phoneNumber: data.phone,
        templateName: data.templateName,
        content: data.content.slice(0, 5000),
        direction: 'OUTBOUND',
        provider: providerEnum,
        waMessageId: data.result.providerMessageId ?? null,
        status: data.result.success ? 'SENT' : 'FAILED',
        failureReason: data.result.errorMessage ?? null,
        statusUpdatedAt: new Date(),
        userId: data.userId ?? null,
        consultationId: data.consultationId ?? null,
      },
    });
  } catch (err) {
    // DB tracking failure must never break message sending
    logger.error('[WhatsAppClient] DB tracking failed (non-blocking)', {
      error: (err as Error).message,
    });
  }
}

function mapProviderToEnum(provider: string): 'META' | 'GUPSHUP' | 'AISENSY' {
  switch (provider) {
    case 'meta':
      return 'META';
    case 'gupshup':
      return 'GUPSHUP';
    case 'aisensy':
      return 'AISENSY';
    default:
      return 'META'; // fallback for 'none'/'all' edge cases
  }
}

export type { TemplateComponent, WhatsAppSendResult } from './types.js';

// ═══════════════════════════════════════════════════════════════
// QUEUED VARIANTS — Task #41
// Use these for non-blocking sends. Direct sends still available
// for cases where caller needs immediate result (rare).
// ═══════════════════════════════════════════════════════════════

import {
  enqueueWhatsAppTemplate as _enqueueTemplate,
  enqueueWhatsAppText as _enqueueText,
} from '../../lib/queue/index.js';

/**
 * Async fire-and-forget WhatsApp template send.
 * Returns immediately with jobId; actual send happens in worker.
 */
export const queueWhatsAppTemplate = _enqueueTemplate;

/**
 * Async fire-and-forget WhatsApp text send.
 */
export const queueWhatsAppText = _enqueueText;
