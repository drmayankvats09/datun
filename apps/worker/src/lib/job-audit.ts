// ═══════════════════════════════════════════════════════════════
// JOB AUDIT — Persist every job execution to Postgres
//
// Why store in DB (not just Redis):
//   - Redis jobs auto-removed on completion (BullMQ removeOnComplete)
//   - DB is source of truth for "show me all PDF jobs in last 24h"
//   - Future: Task #44 training data capture (job logs → ML training)
//
// Pattern: Stripe webhook deliveries persistence, Linear job audit
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@repo/db';
import type { Job } from 'bullmq';
import { logger } from './logger.js';

/**
 * Sanitize payload for storage — strip secrets, truncate long fields.
 * Critical: don't store API tokens, passwords, raw OTPs in Postgres.
 */
function sanitizePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const obj = payload as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  const skipKeys = new Set([
    'password',
    'token',
    'secret',
    'apikey',
    'authorization',
    'otp',
    'code', // OTP codes
  ]);
  for (const [key, value] of Object.entries(obj)) {
    if (skipKeys.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 1000) {
      sanitized[key] = value.slice(0, 1000) + '... [truncated]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export async function recordJobStart(job: Job): Promise<void> {
  try {
    const payload = sanitizePayload(job.data) as Record<string, unknown>;
    const userId = (payload?.userId as string | undefined) ?? null;
    const consultationId = (payload?.consultationId as string | undefined) ?? null;

    await prisma.jobLog.upsert({
      where: { jobId: String(job.id) },
      create: {
        queueName: job.queueName,
        jobName: job.name,
        jobId: String(job.id),
        status: 'ACTIVE',
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts ?? 1,
        payload: payload as never,
        userId,
        consultationId,
        startedAt: new Date(),
      },
      update: {
        status: 'ACTIVE',
        attempt: job.attemptsMade + 1,
        startedAt: new Date(),
      },
    });
  } catch (err) {
    // Audit failure must NEVER break the worker
    logger.warn('[JobAudit] start record failed', {
      jobId: job.id,
      error: (err as Error).message,
    });
  }
}

export async function recordJobComplete(
  job: Job,
  result: unknown,
  durationMs: number,
): Promise<void> {
  try {
    await prisma.jobLog.update({
      where: { jobId: String(job.id) },
      data: {
        status: 'COMPLETED',
        result: (result ?? null) as never,
        completedAt: new Date(),
        durationMs,
      },
    });
  } catch (err) {
    logger.warn('[JobAudit] complete record failed', {
      jobId: job.id,
      error: (err as Error).message,
    });
  }
}

export async function recordJobFailure(job: Job, error: Error, durationMs: number): Promise<void> {
  try {
    await prisma.jobLog.update({
      where: { jobId: String(job.id) },
      data: {
        status: 'FAILED',
        error: error.message.slice(0, 4000),
        errorStack: (error.stack ?? '').slice(0, 4000),
        completedAt: new Date(),
        durationMs,
      },
    });
  } catch (err) {
    logger.warn('[JobAudit] failure record failed', {
      jobId: job.id,
      error: (err as Error).message,
    });
  }
}
