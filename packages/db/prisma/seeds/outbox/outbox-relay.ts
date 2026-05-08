// ═══════════════════════════════════════════════════════════════
// OUTBOX RELAY — polling-based publisher with SKIP LOCKED
// Reads pending → publishes → marks published; exponential backoff on failure
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';
import type { OutboxEventRecord, PublishResult, DatunEventType } from './outbox.types';

export type Publisher = (event: OutboxEventRecord) => Promise<PublishResult>;

export interface RelayOptions {
  readonly batchSize?: number;
  readonly pollIntervalMs?: number;
  readonly maxAttempts?: number;
  readonly backoffBaseMs?: number;
  readonly backoffMaxMs?: number;
}

const DEFAULTS: Required<RelayOptions> = {
  batchSize: 100,
  pollIntervalMs: 2_000,
  maxAttempts: 10,
  backoffBaseMs: 1_000,
  backoffMaxMs: 5 * 60_000,
};

export class OutboxRelay {
  private running = false;
  private readonly opts: Required<RelayOptions>;
  private readonly publishers = new Map<DatunEventType | '*', Publisher>();

  constructor(
    private readonly prisma: PrismaClient,
    opts: RelayOptions = {},
  ) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  registerPublisher(eventType: DatunEventType | '*', publisher: Publisher): void {
    this.publishers.set(eventType, publisher);
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.running) {
      try {
        await this.processBatch();
      } catch (err) {
        console.error('[OutboxRelay] batch failed:', err);
      }
      await new Promise((r) => setTimeout(r, this.opts.pollIntervalMs));
    }
  }

  stop(): void {
    this.running = false;
  }
  /**
   * Drains the outbox for a bounded duration or until empty.
   * Used by cron-triggered worker processors (BullMQ jobs).
   *
   * Returns counts of {processed, published, failed, deadLettered}.
   * Does NOT loop forever — caller (cron) is responsible for periodicity.
   */
  async drainOnce(opts: { readonly maxRunMs?: number } = {}): Promise<{
    processed: number;
    published: number;
    failed: number;
    deadLettered: number;
  }> {
    const maxRunMs = opts.maxRunMs ?? 25_000;
    const deadline = Date.now() + maxRunMs;
    const totals = { processed: 0, published: 0, failed: 0, deadLettered: 0 };

    while (Date.now() < deadline) {
      const before = await this.snapshotCounts();
      await this.processBatch();
      const after = await this.snapshotCounts();
      const batchProcessed =
        after.published -
        before.published +
        after.dead -
        before.dead +
        after.failed -
        before.failed;

      totals.processed += batchProcessed;
      totals.published += Math.max(0, after.published - before.published);
      totals.failed += Math.max(0, after.failed - before.failed);
      totals.deadLettered += Math.max(0, after.dead - before.dead);

      if (batchProcessed === 0) break; // drained
    }
    return totals;
  }

  private async snapshotCounts(): Promise<{ published: number; failed: number; dead: number }> {
    const [published, failed, dead] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { status: 'published' } }),
      this.prisma.outboxEvent.count({ where: { status: 'failed' } }),
      this.prisma.outboxDeadLetter.count(),
    ]);
    return { published, failed, dead };
  }

  /**
   * Atomically claim a batch of pending events using SKIP LOCKED so multiple
   * relay processes can run in parallel without duplicate publishes.
   */
  private async processBatch(): Promise<void> {
    const claimed = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "OutboxEvent"
        WHERE status = 'pending' AND "nextAttemptAt" <= NOW()
        ORDER BY "sequenceId" ASC
        LIMIT ${this.opts.batchSize}
        FOR UPDATE SKIP LOCKED
      `;
      if (rows.length === 0) return [];
      const ids = rows.map((r) => r.id);
      // No status flip yet; we'll flip per-event after publish (avoids stuck-in-flight)
      return ids;
    });

    if (claimed.length === 0) return;

    const events = (await this.prisma.outboxEvent.findMany({
      where: { id: { in: claimed } },
      orderBy: { sequenceId: 'asc' },
    })) as OutboxEventRecord[];

    for (const ev of events) {
      const publisher =
        this.publishers.get(ev.eventType as DatunEventType) ?? this.publishers.get('*');
      if (!publisher) {
        await this.markFailed(ev, 'no publisher registered for eventType', false);
        continue;
      }
      const result = await publisher(ev).catch(
        (err) => ({ success: false, error: String(err), retryable: true }) satisfies PublishResult,
      );
      if (result.success) {
        await this.markPublished(ev);
      } else {
        await this.markFailed(ev, result.error ?? 'unknown', result.retryable);
      }
    }
  }

  private async markPublished(ev: OutboxEventRecord): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id: ev.id },
      data: { status: 'published', publishedAt: new Date() },
    });
  }

  private async markFailed(
    ev: OutboxEventRecord,
    error: string,
    retryable: boolean,
  ): Promise<void> {
    const nextAttempt = ev.attemptCount + 1;
    if (!retryable || nextAttempt >= this.opts.maxAttempts) {
      await this.prisma.$transaction(async (tx) => {
        await tx.outboxEvent.update({
          where: { id: ev.id },
          data: {
            status: 'dead',
            failedAt: new Date(),
            attemptCount: nextAttempt,
            lastError: error,
          },
        });
        await tx.outboxDeadLetter.create({
          data: {
            originalId: ev.id,
            aggregateType: ev.aggregateType,
            aggregateId: ev.aggregateId,
            eventType: ev.eventType,
            payload: ev.payload as never,
            finalError: error,
            attemptCount: nextAttempt,
          },
        });
      });
      return;
    }
    const backoffMs = Math.min(this.opts.backoffBaseMs * 2 ** nextAttempt, this.opts.backoffMaxMs);
    const jitter = Math.floor(Math.random() * (backoffMs * 0.25));
    const next = new Date(Date.now() + backoffMs + jitter);
    await this.prisma.outboxEvent.update({
      where: { id: ev.id },
      data: { attemptCount: nextAttempt, lastError: error, nextAttemptAt: next, status: 'pending' },
    });
  }
}
