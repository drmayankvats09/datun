// ═══════════════════════════════════════════════════════════════
// OUTBOX WRITER — atomic insert with business write
// ═══════════════════════════════════════════════════════════════
import type { Prisma, PrismaClient } from '@prisma/client';
import type { OutboxEventInput } from './outbox.types';

/**
 * Write an outbox event inside an existing Prisma transaction.
 *
 * Usage:
 *   await prisma.$transaction(async (tx) => {
 *     const consultation = await tx.consultation.create({ data: ... });
 *     await writeOutboxEvent(tx, {
 *       aggregateType: 'Consultation',
 *       aggregateId: consultation.id,
 *       eventType: 'consultation.created',
 *       payload: { patientId: consultation.patientId, urgency: consultation.urgency },
 *       partitionKey: consultation.clinicId,
 *     });
 *   });
 */
export async function writeOutboxEvent(
  tx: Prisma.TransactionClient | PrismaClient,
  event: OutboxEventInput,
): Promise<{ id: string }> {
  const created = await tx.outboxEvent.create({
    data: {
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload as never,
      headers: (event.headers ?? {}) as never,
      partitionKey: event.partitionKey ?? null,
    },
    select: { id: true },
  });
  return { id: created.id };
}
