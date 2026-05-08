// ═══════════════════════════════════════════════════════════════
// OUTBOX CLIENT — Transactional outbox writer
//
// Used by outbox-aware-sender wrappers (whatsapp, email).
// Caller passes their existing Prisma transaction; this writes the
// outbox row atomically with the business event so partial publish
// is impossible (transactional outbox pattern, Vaughn Vernon 2020).
//
// Feature-flag controlled: featureFlags.outboxEnabled=false → returns
// flag_disabled so callers fall through to direct send (zero behaviour change).
// ═══════════════════════════════════════════════════════════════

import type { Prisma } from '@repo/db';
import type { DatunEventType } from '@repo/db/prisma/seeds/wave10';
import { featureFlags } from '../../config/feature-flags.js';
import { logger } from '../logger.js';

export interface OutboxEventInput {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: DatunEventType;
  readonly payload: Record<string, unknown>;
}

export type OutboxWriteResult =
  | { written: true; outboxEventId: string }
  | { written: false; reason: 'flag_disabled' }
  | { written: false; reason: 'error'; error: unknown };

/**
 * Write an outbox event inside the caller's transaction.
 * Atomicity: if the caller's tx rolls back, this row vanishes too.
 */
export async function writeToOutbox(
  tx: Prisma.TransactionClient,
  input: OutboxEventInput,
): Promise<OutboxWriteResult> {
  if (!featureFlags.outboxEnabled) {
    return { written: false, reason: 'flag_disabled' };
  }

  try {
    const created = await tx.outboxEvent.create({
      data: {
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        payload: input.payload as Prisma.InputJsonValue,
        status: 'PENDING',
      },
      select: { id: true },
    });

    logger.info('Wrote outbox event', {
      outboxEventId: created.id,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
    });

    return { written: true, outboxEventId: created.id };
  } catch (err) {
    logger.error('Failed to write outbox event', {
      err: err instanceof Error ? err.message : String(err),
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
    });
    return { written: false, reason: 'error', error: err };
  }
}
