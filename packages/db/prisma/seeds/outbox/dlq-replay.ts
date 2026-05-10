// ═══════════════════════════════════════════════════════════════
// DLQ REPLAY — moves dead-letter events back to outbox for retry
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';

export interface ReplayOptions {
  readonly aggregateType?: string;
  readonly limit?: number;
  readonly resetAttemptCount?: boolean;
}

export async function replayDeadLetters(
  prisma: PrismaClient,
  opts: ReplayOptions = {},
): Promise<{ replayed: number }> {
  const limit = opts.limit ?? 100;
  const dlq = (await prisma.outboxDeadLetter.findMany({
    where: opts.aggregateType ? { aggregateType: opts.aggregateType } : {},
    take: limit,
    orderBy: { createdAt: 'asc' },
  })) as Array<{
    id: string;
    originalId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: unknown;
    attemptCount: number;
  }>;

  if (dlq.length === 0) return { replayed: 0 };

  await prisma.$transaction(async (tx) => {
    for (const r of dlq) {
      await tx.outboxEvent.create({
        data: {
          aggregateType: r.aggregateType,
          aggregateId: r.aggregateId,
          eventType: r.eventType,
          payload: r.payload as never,
          status: 'pending',
          attemptCount: opts.resetAttemptCount ? 0 : r.attemptCount,
          nextAttemptAt: new Date(),
        },
      });
      await tx.outboxDeadLetter.update({
        where: { id: r.id },
        data: { retriedAt: new Date() },
      });
    }
  });
  return { replayed: dlq.length };
}
