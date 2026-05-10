// ═══════════════════════════════════════════════════════════════
// WEBHOOK ROUTES — Multi-provider WhatsApp webhooks
// GET /webhook        = Meta verification handshake
// POST /webhook       = Meta incoming messages + status updates
// POST /webhook/gupshup = Gupshup incoming messages + status updates
//
// SECURITY: Provider-aware HMAC signature verification.
// IDEMPOTENCY: Redis-backed wamid dedup (24hr TTL).
// All inbound messages → markInbound() opens 24hr customer window.
// ═══════════════════════════════════════════════════════════════

import { Router, type Request, type Response } from 'express';
import { prisma } from '@repo/db';
import { BRAND, CONTACTS, URLS } from '@repo/shared';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';
import { sendWhatsAppText } from '../services/whatsapp/index.js';
import { env } from '../config/env.js';
import {
  normalizeMetaIncoming,
  normalizeGupshupIncoming,
} from '../services/whatsapp/webhook-normalizer.js';
import { verifyWebhookSignature } from '../services/whatsapp/signature-verifier.js';
import { claimWebhook } from '../services/whatsapp/idempotency.js';
import { markInbound, closeWindow } from '../services/whatsapp/window-tracker.js';
import type {
  UnifiedIncomingMessage,
  UnifiedStatusUpdate,
  WhatsAppProviderName,
} from '../services/whatsapp/types.js';

export const webhookRouter = Router();

// ── GET /webhook — Meta verification handshake ──
webhookRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('[Webhook] Meta verification OK');
    res.status(200).send(challenge);
  } else {
    logger.warn('[Webhook] Meta verification FAILED — token mismatch');
    res.sendStatus(403);
  }
});

// ── POST /webhook — Meta incoming events ──
webhookRouter.post('/', async (req: Request, res: Response) => {
  res.sendStatus(200); // ALWAYS 200 immediately — Meta retries otherwise
  await handleProviderWebhook(req, 'meta');
});

// ── POST /webhook/gupshup — Gupshup incoming events ──
webhookRouter.post('/gupshup', async (req: Request, res: Response) => {
  res.sendStatus(200);
  await handleProviderWebhook(req, 'gupshup');
});

// ── Unified webhook handler ──

async function handleProviderWebhook(req: Request, provider: WhatsAppProviderName): Promise<void> {
  try {
    // 1. Signature verification
    // CRITICAL FIX (Day 11): Use raw body captured by express.json verify callback.
    // JSON.stringify(req.body) re-serializes parsed JSON which produces DIFFERENT bytes
    // than what Meta/Gupshup hashed. Causes intermittent signature failures.
    // Fallback to JSON.stringify only for safety (e.g., test environments where
    // rawBody capture wasn't wired) — production path always uses rawBody.
    const signatureHeader = provider === 'meta' ? 'x-hub-signature-256' : 'x-gs-signature';
    const signature = req.headers[signatureHeader] as string | undefined;
    const rawBody = (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(req.body);

    if (!verifyWebhookSignature({ provider, signature, rawBody })) {
      logger.error('[Webhook] Signature verification FAILED — possible spoof', { provider });
      Sentry.captureMessage(`WhatsApp ${provider} webhook signature failed`, 'warning');
      return;
    }

    // 2. Normalize payload
    const normalized =
      provider === 'meta' ? normalizeMetaIncoming(req.body) : normalizeGupshupIncoming(req.body);

    // 3. Process status updates first (no idempotency — they update existing rows)
    for (const status of normalized.statuses) {
      await handleStatusUpdate(status);
    }

    // 4. Process incoming messages (idempotency-protected)
    for (const message of normalized.messages) {
      const claimed = await claimWebhook(`${provider}:${message.messageId}`);
      if (!claimed) continue;
      await handleIncomingMessage(message);
    }
  } catch (err) {
    logger.error('[Webhook] Processing error', {
      provider,
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    Sentry.captureException(err);
  }
}

// ── Status update handler ──

async function handleStatusUpdate(s: UnifiedStatusUpdate): Promise<void> {
  try {
    const statusMap: Record<UnifiedStatusUpdate['status'], string> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    };

    await prisma.whatsAppMessage.updateMany({
      where: { waMessageId: s.messageId },
      data: {
        status: statusMap[s.status] as 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
        statusUpdatedAt: new Date(s.timestamp * 1000),
        ...(s.errorMessage && { failureReason: s.errorMessage }),
      },
    });

    logger.info('[Webhook] Status update', {
      provider: s.provider,
      messageId: s.messageId,
      status: s.status,
    });
  } catch (err) {
    logger.error('[Webhook] Status update DB error', { error: (err as Error).message });
  }
}

// ── Incoming message handler ──

async function handleIncomingMessage(m: UnifiedIncomingMessage): Promise<void> {
  try {
    // Open 24-hour customer service window
    await markInbound(m.from);

    // Log inbound message
    await prisma.whatsAppMessage.create({
      data: {
        phoneNumber: m.from,
        templateName: null,
        content: m.text ?? `[${m.type}]`,
        direction: 'INBOUND',
        provider: m.provider === 'meta' ? 'META' : m.provider === 'gupshup' ? 'GUPSHUP' : 'AISENSY',
        waMessageId: m.messageId,
        status: 'SENT',
        statusUpdatedAt: new Date(m.timestamp * 1000),
      },
    });

    // STOP keyword handler — opt-out (TRAI-compliant via NotificationPreference)
    const text = (m.text ?? '').trim().toUpperCase();
    if (text === 'STOP' || text === 'UNSUBSCRIBE') {
      await closeWindow(m.from);

      // Find user by phone, then disable WhatsApp notifications across all categories
      const user = await prisma.user.findUnique({
        where: { phone: m.from },
        select: { id: true },
      });

      if (user) {
        // Disable WhatsApp channel for all notification categories
        // (createMany skip duplicates — upsert per category isn't needed since
        //  we want a blanket opt-out across the WHATSAPP channel)
        await prisma.notificationPreference.updateMany({
          where: { userId: user.id, channel: 'WHATSAPP' },
          data: { isEnabled: false },
        });
        logger.info('[Webhook] User opted out of WhatsApp', {
          phone: m.from,
          userId: user.id,
        });
      } else {
        logger.warn('[Webhook] STOP from unknown phone — closed window only', {
          phone: m.from,
        });
      }

      // No confirmation reply — Meta best practice for STOP is silent acknowledgment
      // (replying could be interpreted as continued engagement after opt-out request).
      // The window-close + preference update is the acknowledgment.
      return;
    }

    // Auto-reply for first-time users (within just-opened 24hr window)
    if (m.type === 'text' && m.text) {
      await sendWhatsAppText(
        m.from,
        `Namaste! ${BRAND.name} se aapka contact mila. Visit ${URLS.website} for instant dental guidance, or call us at ${CONTACTS.supportPhoneDisplay}.`,
        { skipWindowCheck: true }, // we just opened the window via markInbound
      );
    }
  } catch (err) {
    logger.error('[Webhook] Incoming message error', {
      provider: m.provider,
      from: m.from,
      error: (err as Error).message,
    });
  }
}
