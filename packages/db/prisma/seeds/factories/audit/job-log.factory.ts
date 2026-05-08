// ═══════════════════════════════════════════════════════════════
// JOB LOG FACTORY — BullMQ job audit trail (B-3 v2)
//
// Schema alignment (packages/db/prisma/schema.prisma → model JobLog):
//   Required:  id, queueName, jobName, jobId (unique), status, attempt,
//              maxAttempts, payload (Json), queuedAt
//   Optional:  result (Json?), error, errorStack, durationMs, startedAt,
//              completedAt, userId, consultationId
//
// JobStatus enum (schema): QUEUED | ACTIVE | COMPLETED | FAILED | DELAYED | STALLED
// ═══════════════════════════════════════════════════════════════

import { Prisma, type JobLog, type JobStatus, type PrismaClient } from '@prisma/client';
import { defineFactory, prismaInput, toJsonInput, toNullableJsonInput } from '../core';

interface JobLogTransient {
  readonly queueName: 'whatsapp' | 'email' | 'pdf' | 'scheduled' | 'followup';
  readonly jobName: string;
  readonly forceStatus?: JobStatus;
  readonly userId?: string;
  readonly consultationId?: string;
}

export const jobLogFactory = defineFactory<JobLog, JobLogTransient>({
  name: 'job-log',
  defaultTransient: { queueName: 'followup', jobName: '3day-followup' },

  build: ({ sequence, faker, transient }) => {
    // Status distribution mirrors BullMQ production telemetry baselines
    const status: JobStatus =
      transient.forceStatus ??
      faker.helpers.weightedArrayElement<JobStatus>([
        { weight: 80, value: 'COMPLETED' },
        { weight: 12, value: 'FAILED' },
        { weight: 5, value: 'ACTIVE' },
        { weight: 3, value: 'QUEUED' },
      ]);

    const queuedAt = faker.date.recent({ days: 30 });
    const durationMs = faker.number.int({ min: 100, max: 60000 });
    const startedAt =
      status === 'ACTIVE' || status === 'COMPLETED' || status === 'FAILED'
        ? new Date(queuedAt.getTime() + faker.number.int({ min: 50, max: 5000 }))
        : null;
    const completedAt =
      (status === 'COMPLETED' || status === 'FAILED') && startedAt
        ? new Date(startedAt.getTime() + durationMs)
        : null;

    return {
      id: `job-${String(sequence).padStart(10, '0')}`,
      queueName: transient.queueName,
      jobName: transient.jobName,
      jobId: `bull:${transient.queueName}:${faker.string.alphanumeric(16)}`,
      status,
      attempt: status === 'FAILED' ? faker.number.int({ min: 2, max: 5 }) : 1,
      maxAttempts: 5,
      payload: { exampleKey: 'exampleValue' },
      result: status === 'COMPLETED' ? { ok: true, durationMs } : null,
      error:
        status === 'FAILED'
          ? faker.helpers.arrayElement([
              'WhatsApp API rate limit exceeded',
              'Patient phone number invalid',
              'Template not approved by Meta',
              'Database connection timeout',
            ])
          : null,
      errorStack: status === 'FAILED' ? 'Error: ...\n  at handler.ts:42' : null,
      durationMs: completedAt ? durationMs : null,
      queuedAt,
      startedAt,
      completedAt,
      userId: transient.userId ?? null,
      consultationId: transient.consultationId ?? null,
    } as unknown as JobLog;
  },

  persist: async (log, prisma) => {
    const j = log as Record<string, unknown>;
    return prisma.jobLog.create({
      data: prismaInput<Prisma.JobLogUncheckedCreateInput>({
        id: j.id as string,
        queueName: j.queueName as string,
        jobName: j.jobName as string,
        jobId: j.jobId as string,
        status: j.status as JobStatus,
        attempt: (j.attempt as number | undefined) ?? 1,
        maxAttempts: (j.maxAttempts as number | undefined) ?? 5,
        payload: toJsonInput(j.payload),
        result: toNullableJsonInput(j.result),
        error: (j.error as string | null | undefined) ?? null,
        errorStack: (j.errorStack as string | null | undefined) ?? null,
        durationMs: (j.durationMs as number | null | undefined) ?? null,
        queuedAt: (j.queuedAt as Date | undefined) ?? new Date(),
        startedAt: (j.startedAt as Date | null | undefined) ?? null,
        completedAt: (j.completedAt as Date | null | undefined) ?? null,
        userId: (j.userId as string | null | undefined) ?? null,
        consultationId: (j.consultationId as string | null | undefined) ?? null,
      }),
    }) as unknown as JobLog;
  },
});
