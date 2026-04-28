// ═══════════════════════════════════════════════════════════════
// WEBHOOK ROUTES — /webhook
// WhatsApp Meta Cloud API webhook.
// GET = Meta verification handshake.
// POST = Incoming messages + delivery status updates.
//
// SECURITY: x-hub-signature-256 verification prevents spoofing.
// Every incoming message is logged to WhatsAppMessage table.
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '@repo/db';
import { BRAND, CONTACTS, URLS } from '@repo/shared';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';
import { sendWhatsAppText, sendWhatsAppTemplate } from '../services/whatsapp/index.js';
import { env } from '../config/env.js';

export const webhookRouter = Router();

// ── GET /webhook — Meta verification handshake ──
webhookRouter.get('/', (req, res) => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    logger.warn('Webhook verification FAILED — token mismatch');
    res.sendStatus(403);
  }
});

// ── POST /webhook — Incoming WhatsApp events ──
webhookRouter.post('/', async (req, res) => {
  // Always respond 200 immediately — Meta retries if no 200 within 5s
  res.sendStatus(200);

  try {
    // Signature verification (prevent spoofing)
    if (!verifyWebhookSignature(req)) {
      logger.error('Webhook signature verification FAILED — possible spoof');
      Sentry.captureMessage('WhatsApp webhook signature verification failed', 'warning');
      return;
    }

    const body = req.body as WebhookBody;
    const entry = body?.entry?.[0];
    const changes = entry?.changes ?? [];

    for (const change of changes) {
      const value = change.value;

      if (value?.statuses) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status);
        }
      }

      if (value?.messages) {
        for (const message of value.messages) {
          await handleIncomingMessage(message);
        }
      }
    }
  } catch (err) {
    logger.error('Webhook processing error', {
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    Sentry.captureException(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// SIGNATURE VERIFICATION
// ═══════════════════════════════════════════════════════════════

function verifyWebhookSignature(req: { headers: Record<string, unknown>; body: unknown }): boolean {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;

  // P2-F4: Production NEVER bypasses. Dev allows if not configured (sandbox testing).
  if (env.NODE_ENV === 'production') {
    if (!signature || !env.WHATSAPP_VERIFY_TOKEN) {
      logger.error(
        'Webhook signature verification failed: missing signature or token in production',
      );
      return false;
    }
  } else {
    if (!signature || !env.WHATSAPP_VERIFY_TOKEN) return true;
  }

  try {
    const expectedSignature =
      'sha256=' +
      crypto
        .createHmac('sha256', env.WHATSAPP_VERIFY_TOKEN)
        .update(JSON.stringify(req.body))
        .digest('hex');

    // P2-F22: Buffer length check before timingSafeEqual
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length) return false;

    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// STATUS UPDATES — Track delivery in database
// ═══════════════════════════════════════════════════════════════

async function handleStatusUpdate(status: StatusEvent): Promise<void> {
  const waMessageId = status.id;
  const newStatus = status.status;

  const mappedStatus = mapStatus(newStatus);
  const failureReason = newStatus === 'failed' ? JSON.stringify(status.errors ?? []) : undefined;

  try {
    const updated = await prisma.whatsAppMessage.updateMany({
      where: { waMessageId },
      data: {
        status: mappedStatus,
        statusUpdatedAt: new Date(),
        ...(failureReason ? { failureReason } : {}),
      },
    });

    if (updated.count > 0) {
      logger.info('WhatsApp status update', {
        waMessageId,
        status: newStatus,
        mapped: mappedStatus,
        recipient: status.recipient_id,
      });
    }

    if (newStatus === 'failed' && status.errors?.length) {
      logger.error('WhatsApp delivery FAILED', {
        waMessageId,
        recipient: status.recipient_id,
        errors: status.errors,
      });
    }
  } catch (err) {
    logger.error('Failed to update WhatsApp status in DB', {
      waMessageId,
      error: (err as Error).message,
    });
  }
}

function mapStatus(metaStatus: string): 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' {
  const map: Record<string, 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
    sent: 'SENT',
    delivered: 'DELIVERED',
    read: 'READ',
    failed: 'FAILED',
  };
  return map[metaStatus] ?? 'SENT';
}

// ═══════════════════════════════════════════════════════════════
// INCOMING MESSAGES
// ═══════════════════════════════════════════════════════════════

async function handleIncomingMessage(message: IncomingMessage): Promise<void> {
  const from = message.from;

  let msgBody = '';
  if (message.type === 'button') {
    msgBody = message.button?.text?.trim() ?? '';
  } else if (message.type === 'text') {
    msgBody = message.text?.body?.trim() ?? '';
  } else if (message.type === 'interactive') {
    msgBody = message.interactive?.button_reply?.title?.trim() ?? '';
  }

  if (!msgBody) return;

  logger.info('WhatsApp incoming', { from, type: message.type, body: msgBody });

  // P2-F19: Fire-and-forget — don't block webhook critical path
  trackInboundMessage(from, msgBody).catch((err) => {
    logger.error('Inbound message tracking failed (non-blocking)', {
      from,
      error: (err as Error).message,
    });
  });

  const lower = msgBody.toLowerCase();

  if (lower === 'book appointment') {
    await handleBookAppointment(from);
  } else if (lower === 'still in pain') {
    await handleStillInPain(from);
  } else if (lower === 'feeling better') {
    await handleFeelingBetter(from);
  } else if (lower === 'view report') {
    await handleViewReport(from);
  } else if (lower === 'talk to us' || lower === 'talk to our team') {
    await handleTalkToUs(from);
  } else {
    logger.info('WhatsApp free-text (unhandled)', { from, body: msgBody });
  }
}

// ═══════════════════════════════════════════════════════════════
// BUTTON HANDLERS — All use BRAND + CONTACTS from @repo/shared
// ═══════════════════════════════════════════════════════════════

async function sendInternalAlert(
  alertType: string,
  from: string,
  detail: string,
  urgency: string,
): Promise<void> {
  const alertParams = [
    {
      type: 'body' as const,
      parameters: [
        { type: 'text' as const, text: alertType },
        { type: 'text' as const, text: from },
        { type: 'text' as const, text: detail },
        { type: 'text' as const, text: urgency },
      ],
    },
  ];
  for (const recipient of CONTACTS.alertRecipients) {
    await sendWhatsAppTemplate(recipient, CONTACTS.internalAlertTemplate, alertParams);
  }
}

async function handleBookAppointment(from: string): Promise<void> {
  await sendWhatsAppText(
    from,
    `Thank you! 😊\n\nYour appointment request has been received.\n\nOur care team will contact you within 30 minutes to confirm your appointment with the right dentist near you.\n\nNeed urgent help?\n📞 ${CONTACTS.supportPhoneDisplay}\n\n${BRAND.tagline}\n— ${BRAND.name}`,
  );
  await sendInternalAlert(
    'Appointment Request',
    from,
    'Patient clicked Book Appointment',
    'ACTION NEEDED',
  );
}

async function handleStillInPain(from: string): Promise<void> {
  await sendWhatsAppText(
    from,
    `We're sorry to hear that. Your health is our priority.\n\nWe strongly recommend visiting a dentist at the earliest. Our care team will reach out to you shortly to help book an appointment.\n\nNeed immediate help?\n📞 ${CONTACTS.supportPhoneDisplay}\n\n${BRAND.tagline}\n— ${BRAND.name}`,
  );
  await sendInternalAlert(
    'URGENT — Still in Pain',
    from,
    'Follow-up: patient still in pain',
    'EMERGENCY',
  );
}

async function handleFeelingBetter(from: string): Promise<void> {
  await sendWhatsAppText(
    from,
    `That's wonderful to hear! 😊\n\nKeep following your care instructions from the report. If anything changes, we're always here.\n\nAsk ${BRAND.name} · ${URLS.website}\n\n— ${BRAND.name}`,
  );
}

async function handleViewReport(from: string): Promise<void> {
  try {
    const phoneClean = from.replace(/^91/, '');
    const consultation = await prisma.consultation.findFirst({
      where: {
        user: { phone: { contains: phoneClean } },
        status: 'COMPLETED',
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (consultation) {
      await sendWhatsAppText(
        from,
        `Here's your latest dental report:\n\n📋 ${URLS.reportUrl(consultation.id)}\n\nTap the link to view and download.\n\n— ${BRAND.name}`,
      );
    } else {
      await sendWhatsAppText(
        from,
        `We couldn't find a report linked to this number.\n\nStart a consultation:\n🔗 www.${URLS.website}\n\n— ${BRAND.name}`,
      );
    }
  } catch (err) {
    logger.error('View report lookup failed', {
      from,
      error: (err as Error).message,
    });
    await sendWhatsAppText(
      from,
      `Something went wrong. Please try again or visit:\n🔗 www.${URLS.website}\n\n— ${BRAND.name}`,
    );
  }
}

async function handleTalkToUs(from: string): Promise<void> {
  await sendWhatsAppText(
    from,
    `Our care team is here for you.\n\nYou can reach us directly:\n📞 Call/WhatsApp: ${CONTACTS.supportPhoneDisplay}\n\nOr reply here — we're listening.\n\n${BRAND.tagline}\n— ${BRAND.name}`,
  );
  await sendInternalAlert('Talk Request', from, 'Patient wants to talk', 'ROUTINE');
}

// ═══════════════════════════════════════════════════════════════
// DB TRACKING — Log every inbound message
// ═══════════════════════════════════════════════════════════════

async function trackInboundMessage(from: string, content: string): Promise<void> {
  try {
    await prisma.whatsAppMessage.create({
      data: {
        phoneNumber: from,
        templateName: '__inbound__',
        content: content.slice(0, 5000),
        direction: 'INBOUND',
        provider: 'META',
        status: 'DELIVERED',
        statusUpdatedAt: new Date(),
      },
    });
  } catch (err) {
    logger.error('Failed to track inbound WhatsApp message', {
      error: (err as Error).message,
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS — Meta Webhook payload shape
// ═══════════════════════════════════════════════════════════════

interface WebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: IncomingMessage[];
        statuses?: StatusEvent[];
      };
    }>;
  }>;
}

interface IncomingMessage {
  from: string;
  type: string;
  text?: { body: string };
  button?: { text: string };
  interactive?: { button_reply?: { title: string } };
}

interface StatusEvent {
  id: string;
  status: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}
