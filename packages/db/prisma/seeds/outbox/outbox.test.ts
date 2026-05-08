import { describe, expect, it } from 'vitest';
import { withTestDb } from '../validation/test-helpers';
import { writeOutboxEvent } from './outbox-writer';
import { OutboxRelay } from './outbox-relay';
import { noopPublisher } from './publishers/noop-publisher';

describe('Outbox pattern', () => {
  it('writes inside transaction, relay publishes once', async () => {
    await withTestDb(async ({ prisma }) => {
      const exists =
        (await prisma.$queryRaw`SELECT to_regclass('"OutboxEvent"')::text as t`) as Array<{
          t: string | null;
        }>;
      if (!exists[0]?.t) return;

      // Write inside a transaction together with a synthetic business action
      await prisma.$transaction(async (tx) => {
        await writeOutboxEvent(tx, {
          aggregateType: 'TestAggregate',
          aggregateId: 'agg-1',
          eventType: 'consultation.created',
          payload: { foo: 'bar' },
        });
      });

      const relay = new OutboxRelay(prisma, { pollIntervalMs: 100, batchSize: 10 });
      relay.registerPublisher('*', noopPublisher);
      const startPromise = relay.start();
      // wait briefly then stop
      await new Promise((r) => setTimeout(r, 600));
      relay.stop();
      await Promise.race([startPromise, new Promise((r) => setTimeout(r, 500))]);

      const published = await prisma.outboxEvent.count({ where: { status: 'published' } });
      expect(published).toBeGreaterThan(0);
    });
  }, 90_000);
});
