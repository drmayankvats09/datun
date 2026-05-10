// ═══════════════════════════════════════════════════════════════
// OUTBOX RELAY PROCESSOR
// ═══════════════════════════════════════════════════════════════

import type { Job } from 'bullmq';
import { prisma } from '@repo/db';
import {
  OutboxRelay,
  whatsappPublisher,
  emailPublisher,
  noopPublisher,
} from '@repo/db/prisma/seeds/wave10';
import type { Publisher } from '@repo/db/prisma/seeds/wave10';
import { logger } from '../lib/logger.js';

export interface OutboxRelayJobData {
  readonly batchSize?: number;
  readonly maxRunMs?: number;
}

interface OutboxRelayResult {
  readonly processed: number;
  readonly published: number;
  readonly failed: number;
  readonly deadLettered: number;
  readonly durationMs: number;
}

let relay: OutboxRelay | null = null;

function getRelay(): OutboxRelay {
  if (relay) return relay;
  relay = new OutboxRelay(prisma, {
    batchSize: 100,
    pollIntervalMs: 1_000,
    maxAttempts: 10,
    backoffBaseMs: 1_000,
    backoffMaxMs: 5 * 60_000,
  });
  const whatsAppEvents = [
    'whatsapp.template_consultation_complete',
    'whatsapp.template_followup_3day',
    'whatsapp.template_followup_7day',
    'whatsapp.template_appointment_reminder',
    'whatsapp.send_requested',
  ] as const;
  for (const eventType of whatsAppEvents) {
    relay.registerPublisher(eventType, whatsappPublisher as Publisher);
  }
  relay.registerPublisher('email.send_requested', emailPublisher as Publisher);
  relay.registerPublisher('*', noopPublisher as Publisher);
  logger.info('OutboxRelay initialized with publishers');
  return relay;
}

export async function processOutboxRelayJob(
  job: Job<OutboxRelayJobData>,
): Promise<OutboxRelayResult> {
  const startedAt = Date.now();
  const maxRunMs = job.data.maxRunMs ?? 25_000;

  const r = getRelay();
  const result = await r.drainOnce({ maxRunMs });

  const durationMs = Date.now() - startedAt;
  logger.info('Outbox relay job complete', {
    jobId: job.id,
    processed: result.processed,
    published: result.published,
    failed: result.failed,
    deadLettered: result.deadLettered,
    durationMs,
  });
  return { ...result, durationMs };
}
