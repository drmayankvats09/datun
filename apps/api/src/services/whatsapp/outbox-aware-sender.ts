// ═══════════════════════════════════════════════════════════════
// OUTBOX-AWARE WHATSAPP SENDER
//
// Drop-in replacement for direct sendWhatsAppTemplate() calls when
// reliable at-least-once delivery is required.
//
// Behaviour:
//   - OUTBOX_ENABLED=true:
//       Writes to outbox table → returns optimistic success.
//       Worker's outbox-relay processor publishes asynchronously.
//   - OUTBOX_ENABLED=false:
//       Delegates directly to existing whatsapp service.
//
// Existing whatsapp/index.ts (Meta → Gupshup → AiSensy + circuit breaker)
// is preserved exactly. The outbox relay calls THAT service when publishing,
// so multi-provider failover + DB logging still happens — just async.
// ═══════════════════════════════════════════════════════════════

import type { Prisma } from '@repo/db';
import type { WhatsAppTemplateName } from '@repo/db';
import type { DatunEventType } from '@repo/db/prisma/seeds/wave10';
import { writeToOutbox } from '../../lib/outbox/outbox-client.js';
import { sendWhatsAppTemplate } from './index.js';
import type { TemplateComponent } from './types.js';
import { logger } from '../../lib/logger.js';

export interface ReliableTemplateSendArgs {
  readonly to: string;
  readonly templateName: WhatsAppTemplateName;
  readonly language?: string;
  readonly components?: ReadonlyArray<TemplateComponent>;
  /** Aggregate identity for outbox tracing (e.g., consultationId, userId). */
  readonly aggregateType: string;
  readonly aggregateId: string;
  /** Optional caller context for direct-send DB tracking. */
  readonly userId?: string;
  readonly consultationId?: string;
}

export interface ReliableSendResult {
  readonly mode: 'outbox' | 'direct';
  readonly outboxEventId?: string;
  readonly directProviderId?: string;
  readonly success: boolean;
  readonly error?: string;
}

/**
 * Sends a WhatsApp template either via outbox (if OUTBOX_ENABLED) or directly.
 *
 * Caller MUST pass `tx` if this is being called from inside a Prisma
 * transaction. Otherwise omit; the function falls through to direct send.
 */
export async function sendWhatsAppTemplateReliably(
  args: ReliableTemplateSendArgs,
  tx?: Prisma.TransactionClient,
): Promise<ReliableSendResult> {
  const eventType = mapTemplateToEventType(args.templateName);

  // ─── Try outbox path ────────────────────────────────────────────
  if (tx) {
    const r = await writeToOutbox(tx, {
      aggregateType: args.aggregateType,
      aggregateId: args.aggregateId,
      eventType,
      payload: {
        to: args.to,
        templateName: args.templateName,
        language: args.language ?? 'en',
        components: args.components ?? [],
      },
    });
    if (r.written) {
      return { mode: 'outbox', outboxEventId: r.outboxEventId, success: true };
    }
    if (r.reason === 'error') {
      logger.error('Outbox write failed — falling through to direct send', {
        err: r.error instanceof Error ? r.error.message : String(r.error),
      });
    }
    // r.reason === 'flag_disabled' → fall through to direct
  }

  // ─── Direct send path ───────────────────────────────────────────
  try {
    const result = await sendWhatsAppTemplate(
      args.to,
      args.templateName,
      [...(args.components ?? [])] as TemplateComponent[],
      {
        ...(args.userId ? { userId: args.userId } : {}),
        ...(args.consultationId ? { consultationId: args.consultationId } : {}),
      },
    );
    return {
      mode: 'direct',
      ...(result.providerMessageId ? { directProviderId: result.providerMessageId } : {}),
      success: result.success,
      ...(result.success ? {} : { error: result.errorMessage ?? 'unknown' }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Direct WhatsApp send failed', {
      err: message,
      to: args.to,
      templateName: args.templateName,
    });
    return { mode: 'direct', success: false, error: message };
  }
}

const TEMPLATE_TO_EVENT: Record<string, string> = {
  consultation_complete: 'whatsapp.template_consultation_complete',
  '3day_followup': 'whatsapp.template_followup_3day',
  '7day_followup': 'whatsapp.template_followup_7day',
  appointment_reminder: 'whatsapp.template_appointment_reminder',
};

function mapTemplateToEventType(template: WhatsAppTemplateName): DatunEventType {
  const mapped = TEMPLATE_TO_EVENT[template];
  if (mapped) return mapped as DatunEventType;
  return 'whatsapp.send_requested' as DatunEventType;
}
