// ═══════════════════════════════════════════════════════════════
// OUTBOX DLQ REPLAY PROCESSOR
// ═══════════════════════════════════════════════════════════════

import type { Job } from 'bullmq';
import { prisma } from '@repo/db';
import { replayDeadLetters } from '@repo/db/prisma/seeds/wave10';
import { logger } from '../lib/logger.js';

export interface DlqReplayJobData {
  readonly aggregateType?: string;
  readonly limit?: number;
  readonly resetAttemptCount?: boolean;
  readonly triggeredBy: string;
}

interface DlqReplayResult {
  readonly replayed: number;
  readonly durationMs: number;
}

export async function processOutboxDlqReplayJob(
  job: Job<DlqReplayJobData>,
): Promise<DlqReplayResult> {
  const startedAt = Date.now();
  const { aggregateType, limit, resetAttemptCount, triggeredBy } = job.data;

  logger.info('DLQ replay started', {
    jobId: job.id,
    aggregateType,
    limit,
    triggeredBy,
  });

  const result = await replayDeadLetters(prisma, {
    aggregateType,
    limit,
    resetAttemptCount,
  });

  const durationMs = Date.now() - startedAt;
  logger.info('DLQ replay complete', {
    jobId: job.id,
    replayed: result.replayed,
    durationMs,
    triggeredBy,
  });
  return { replayed: result.replayed, durationMs };
}
