// ═══════════════════════════════════════════════════════════════
// WHATSAPP SERVICE — Provider-agnostic send + DB tracking
// Every message attempt → WhatsAppMessage row in database.
// If Meta fails → (future) Gupshup fallback → AiSensy emergency.
// Debugging: check whatsapp_messages table for full send history.
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@repo/db';
import { logger } from '../../lib/logger.js';
import { Sentry } from '../../lib/sentry.js';
import { env } from '../../config/env.js';
import { MetaWhatsAppProvider } from './meta.provider.js';
import type { WhatsAppProvider, WhatsAppSendResult, TemplateComponent } from './types.js';
import { normalizeIndianPhone } from '../../utils/phone.js';

// ── Provider Chain (Meta → future Gupshup → future AiSensy) ──
const providers: WhatsAppProvider[] = [];

function getProviders(): WhatsAppProvider[] {
  if (providers.length > 0) return providers;

  if (env.WHATSAPP_ENABLED && env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
    providers.push(new MetaWhatsAppProvider(env.WHATSAPP_TOKEN, env.WHATSAPP_PHONE_NUMBER_ID));
  }
  // Future: if (env.GUPSHUP_API_KEY) providers.push(new GupshupProvider(...));
  // Future: if (env.AISENSY_API_KEY) providers.push(new AiSensyProvider(...));

  return providers;
}

/**
 * Send a text message with fallback chain + DB tracking.
 * Returns send result. Never throws — always returns success/failure.
 */
export async function sendWhatsAppText(
  to: string,
  body: string,
  opts: { userId?: string; consultationId?: string } = {},
): Promise<WhatsAppSendResult> {
  const phone = normalizeIndianPhone(to);
  const chain = getProviders();

  if (chain.length === 0) {
    logger.warn('WhatsApp disabled — no providers configured');
    return { success: false, errorMessage: 'WhatsApp not configured', provider: 'none' };
  }

  for (const provider of chain) {
    const result = await provider.sendText(phone, body);

    // Track in database (fire-and-forget)
    trackMessage({
      phone,
      templateName: '__text__',
      content: body,
      result,
      userId: opts.userId,
      consultationId: opts.consultationId,
    });

    if (result.success) return result;

    // Log fallback attempt
    logger.warn(`WhatsApp text failed via ${provider.name}, trying next provider...`);
  }

  // All providers failed
  const finalResult: WhatsAppSendResult = {
    success: false,
    errorMessage: 'All WhatsApp providers failed',
    provider: 'all',
  };
  Sentry.captureMessage('All WhatsApp providers failed for text message', 'error');
  return finalResult;
}

/**
 * Send a template message with fallback chain + DB tracking.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  components: TemplateComponent[],
  opts: { userId?: string; consultationId?: string } = {},
): Promise<WhatsAppSendResult> {
  const phone = normalizeIndianPhone(to);
  const chain = getProviders();

  if (chain.length === 0) {
    logger.warn('WhatsApp disabled — no providers configured');
    return { success: false, errorMessage: 'WhatsApp not configured', provider: 'none' };
  }

  for (const provider of chain) {
    const result = await provider.sendTemplate(phone, templateName, components);

    trackMessage({
      phone,
      templateName,
      content: JSON.stringify(components),
      result,
      userId: opts.userId,
      consultationId: opts.consultationId,
    });

    if (result.success) return result;

    logger.warn(`WhatsApp template failed via ${provider.name}, trying next...`);
  }

  Sentry.captureMessage(`All WhatsApp providers failed for template: ${templateName}`, 'error');
  return {
    success: false,
    errorMessage: 'All WhatsApp providers failed',
    provider: 'all',
  };
}

/**
 * Run health check on primary provider (for heartbeat cron).
 */
export async function whatsappHealthCheck(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const chain = getProviders();
  if (chain.length === 0) return { ok: false, latencyMs: 0, error: 'No providers' };
  return chain[0]!.healthCheck();
}

// ── DB Tracking ──

function trackMessage(data: {
  phone: string;
  templateName: string;
  content: string;
  result: WhatsAppSendResult;
  userId?: string;
  consultationId?: string;
}): void {
  prisma.whatsAppMessage
    .create({
      data: {
        phoneNumber: data.phone,
        templateName: data.templateName,
        content: data.content.slice(0, 5000),
        direction: 'OUTBOUND',
        provider: data.result.provider === 'meta' ? 'META' : 'META',
        waMessageId: data.result.providerMessageId ?? null,
        status: data.result.success ? 'SENT' : 'FAILED',
        failureReason: data.result.errorMessage ?? null,
        statusUpdatedAt: new Date(),
        userId: data.userId ?? null,
        consultationId: data.consultationId ?? null,
      },
    })
    .catch((err) => {
      // DB tracking failure must never break message sending
      logger.error('Failed to track WhatsApp message in DB', {
        error: (err as Error).message,
      });
    });
}

export type { TemplateComponent, WhatsAppSendResult } from './types.js';
