// ═══════════════════════════════════════════════════════════════
// ADMIN — OUTBOX
//
// Read pending/failed outbox events + replay dead letters.
//
// Schema fields (from Wave 10):
//   OutboxDeadLetter: id, originalId, aggregateType, aggregateId,
//   eventType, payload, finalError, attemptCount, createdAt, retriedAt
//
// BullMQ direct connection (redis client is internal to lib/redis.ts).
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { z } from 'zod';
import { Queue } from 'bullmq';
import { prisma } from '@repo/db';
import { env } from '../../config/env.js';
import { validate } from '../../middleware/validate.js';
import { logger } from '../../lib/logger.js';

export const outboxAdminRouter = Router();

/** Narrow Express's parsed query union to a single non-empty string. */
function pickStr(raw: unknown): string {
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].length > 0) return raw[0];
  return '';
}

// Lazy queue init so admin route doesn't fail at module load when Redis unavailable.
let dlqReplayQueue: Queue | null = null;
function getDlqReplayQueue(): Queue {
  if (dlqReplayQueue) return dlqReplayQueue;
  const url = env.UPSTASH_REDIS_REST_URL ?? process.env['REDIS_URL'] ?? '';
  if (!url) {
    throw new Error('Redis not configured — cannot trigger DLQ replay');
  }
  dlqReplayQueue = new Queue('outbox-dlq-replay', { connection: { url } });
  return dlqReplayQueue;
}

// ─── List recent outbox events ────────────────────────────────────
outboxAdminRouter.get('/events', async (req, res) => {
  const status = pickStr(req.query.status) || undefined;
  const events = await prisma.outboxEvent.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return res.json(events);
});

// ─── List dead letters ────────────────────────────────────────────
outboxAdminRouter.get('/dead-letters', async (_req, res) => {
  const dlq = await prisma.outboxDeadLetter.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return res.json(dlq);
});

// ─── Trigger DLQ replay ───────────────────────────────────────────
const ReplaySchema = z.object({
  body: z.object({
    deadLetterId: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(100).default(10),
  }),
});

outboxAdminRouter.post('/replay', validate(ReplaySchema), async (req, res) => {
  try {
    const queue = getDlqReplayQueue();
    const job = await queue.add('replay-trigger', {
      deadLetterId: req.body.deadLetterId,
      limit: req.body.limit,
      triggeredAt: new Date().toISOString(),
    });

    logger.info('Outbox DLQ replay triggered', {
      jobId: job.id,
      deadLetterId: req.body.deadLetterId,
      limit: req.body.limit,
    });

    return res.json({ ok: true, jobId: job.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Outbox DLQ replay enqueue failed', { err: message });
    return res.status(503).json({ ok: false, error: message });
  }
});
