// ═══════════════════════════════════════════════════════════════
// OUTBOX-AWARE EMAIL SENDER
//
// Drop-in replacement for direct emailClient.send() when reliable
// at-least-once delivery is required.
//
// Behaviour:
//   - OUTBOX_ENABLED=true:
//       Writes to outbox table → returns optimistic success.
//       Worker's outbox-relay processor publishes asynchronously.
//   - OUTBOX_ENABLED=false:
//       Delegates directly to existing emailClient.
//
// Pattern parallels whatsapp/outbox-aware-sender.ts.
// ═══════════════════════════════════════════════════════════════

import type { Prisma } from '@repo/db';
import type { DatunEventType } from '@repo/db/prisma/seeds/wave10';
import { writeToOutbox } from '../../lib/outbox/outbox-client.js';
import { emailClient } from './index.js';
import { renderEmailTemplate } from './templates.js';
import { logger } from '../../lib/logger.js';
import type { EmailTemplateName } from './types.js';

export interface ReliableEmailSendArgs {
  readonly to: string;
  readonly templateName: EmailTemplateName;
  readonly templateVars?: Record<string, unknown>;
  readonly locale?: string;
  /** Aggregate identity for outbox tracing (e.g., consultationId, userId). */
  readonly aggregateType: string;
  readonly aggregateId: string;
  /** Optional caller context for direct-send DB tracking. */
  readonly userId?: string;
  readonly consultationId?: string;
}

export interface ReliableEmailResult {
  readonly mode: 'outbox' | 'direct';
  readonly outboxEventId?: string;
  readonly directProviderId?: string;
  readonly success: boolean;
  readonly error?: string;
}

export async function sendEmailReliably(
  args: ReliableEmailSendArgs,
  tx?: Prisma.TransactionClient,
): Promise<ReliableEmailResult> {
  // Render once for outbox payload (worker may re-render or use as-is)
  const rendered = renderEmailTemplate(
    args.templateName,
    args.templateVars ?? {},
    args.locale ?? 'en',
  );

  // ─── Outbox path ────────────────────────────────────────────────
  if (tx) {
    const r = await writeToOutbox(tx, {
      aggregateType: args.aggregateType,
      aggregateId: args.aggregateId,
      eventType: 'email.send_requested' as DatunEventType,
      payload: {
        to: args.to,
        templateName: args.templateName,
        templateVars: args.templateVars ?? {},
        locale: args.locale ?? 'en',
        subject: rendered.subject,
        html: rendered.html,
      },
    });
    if (r.written) {
      return { mode: 'outbox', outboxEventId: r.outboxEventId, success: true };
    }
    if (r.reason === 'error') {
      logger.error('Email outbox write failed — falling through to direct', {
        err: r.error instanceof Error ? r.error.message : String(r.error),
      });
    }
    // r.reason === 'flag_disabled' → fall through to direct
  }

  // ─── Direct send path ───────────────────────────────────────────
  try {
    const result = await emailClient.send({
      to: args.to,
      template: args.templateName,
      vars: args.templateVars ?? {},
      ...(args.locale ? { locale: args.locale } : {}),
      ...(args.userId ? { userId: args.userId } : {}),
      ...(args.consultationId ? { consultationId: args.consultationId } : {}),
    });
    return {
      mode: 'direct',
      ...(result.providerMessageId ? { directProviderId: result.providerMessageId } : {}),
      success: result.success,
      ...(result.success ? {} : { error: result.errorMessage ?? 'unknown' }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Direct email send failed', {
      err: message,
      to: args.to,
      templateName: args.templateName,
    });
    return { mode: 'direct', success: false, error: message };
  }
}
