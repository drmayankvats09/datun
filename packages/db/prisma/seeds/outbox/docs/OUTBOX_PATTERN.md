# Outbox Pattern — Reliable Event Publishing

## Why

Direct dual-write (DB + WhatsApp) breaks under failure: row saved, message lost. Or message sent, DB rolled back, customer gets duplicate "consultation completed" SMS.

The outbox pattern solves this by writing the event to a Postgres table **inside the same transaction** as the business write. A separate relay process publishes asynchronously with at-least-once guarantee + idempotent consumer.

## Architecture

```
Transaction:
  INSERT INTO Consultation (...)
  INSERT INTO OutboxEvent (eventType, payload)
COMMIT
       ↓ (relay polls every 2s, SKIP LOCKED for parallelism)
OutboxRelay
       ↓
WhatsApp / Email / Slack publisher
       ↓ success → status=published
       ↓ failure (retryable) → exponential backoff
       ↓ failure (final) → OutboxDeadLetter
```

## Usage

```typescript
import { writeOutboxEvent, OutboxRelay, whatsappPublisher } from '../seeds/outbox';

// 1. Write inside business transaction
await prisma.$transaction(async (tx) => {
  const c = await tx.consultation.create({ data: {...} });
  await writeOutboxEvent(tx, {
    aggregateType: 'Consultation',
    aggregateId: c.id,
    eventType: 'whatsapp.template_consultation_complete',
    payload: { to: c.phone, templateName: 'consultation_complete', language: 'en' },
    partitionKey: c.clinicId,
  });
});

// 2. Run the relay (long-running process / cron / Railway worker)
const relay = new OutboxRelay(prisma, { batchSize: 100, pollIntervalMs: 2000 });
relay.registerPublisher('whatsapp.template_consultation_complete', whatsappPublisher);
relay.registerPublisher('email.send_requested', emailPublisher);
await relay.start();
```

## Operational guarantees

- **Atomicity**: business write + outbox write succeed or fail together
- **At-least-once**: events are published at least once (consumer must be idempotent)
- **Ordering**: per `sequenceId` (BIGSERIAL) — relay reads in sequence
- **Parallelism**: SKIP LOCKED safe for multi-replica relay
- **Retry**: exponential backoff with jitter, max 10 attempts default
- **DLQ**: terminal failures land in `OutboxDeadLetter` for human review

## Migration from current dual-write

Replace this:

```typescript
await prisma.consultation.update({ where: { id }, data: { completedAt: new Date() } });
await fetch('https://graph.facebook.com/...'); // dual-write bug
```

With this:

```typescript
await prisma.$transaction(async (tx) => {
  await tx.consultation.update({ where: { id }, data: { completedAt: new Date() } });
  await writeOutboxEvent(tx, { ...whatsapp event ... });
});
```

## Cleanup

Run `cleanupPublishedOutbox(prisma, 7)` daily — deletes published events older than 7 days. DLQ kept 90 days.

## Future migration to Kafka

When Datun reaches 500+ clinics and Wave 10 full streaming becomes justified, swap publishers to Kafka producers. Schema doesn't change.
