// ═══════════════════════════════════════════════════════════════
// JOB AUDIT TESTS — Postgres persistence of job lifecycle
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@repo/db';
import { recordJobStart, recordJobComplete, recordJobFailure } from '../../lib/job-audit.js';

interface MockJob {
  id: string;
  name: string;
  queueName: string;
  attemptsMade: number;
  opts: { attempts?: number };
  data: unknown;
}

describe('Job audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordJobStart', () => {
    it('upserts JobLog with ACTIVE status + sanitized payload', async () => {
      const job: MockJob = {
        id: 'test-job-1',
        name: 'send-template',
        queueName: 'whatsapp',
        attemptsMade: 0,
        opts: { attempts: 5 },
        data: { phone: '+919999135340', templateName: 'welcome', userId: 'u1' },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await recordJobStart(job as any);
      expect(prisma.jobLog.upsert).toHaveBeenCalledOnce();
    });

    it('redacts sensitive fields (token, password, otp, secret)', async () => {
      const job: MockJob = {
        id: 'test-job-2',
        name: 'send-template',
        queueName: 'whatsapp',
        attemptsMade: 0,
        opts: { attempts: 5 },
        data: {
          phone: '+919999135340',
          token: 'super-secret',
          password: 'p4ssw0rd',
          otp: '123456',
          apiKey: 'sk-ant-...',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await recordJobStart(job as any);
      const call = vi.mocked(prisma.jobLog.upsert).mock.calls[0];
      const payload = (call?.[0]?.create as { payload: Record<string, unknown> }).payload;
      expect(payload.token).toBe('[REDACTED]');
      expect(payload.password).toBe('[REDACTED]');
      expect(payload.otp).toBe('[REDACTED]');
      expect(payload.apiKey).toBe('[REDACTED]');
      expect(payload.phone).toBe('+919999135340');
    });

    it('audit failure does not throw — must never break worker', async () => {
      vi.mocked(prisma.jobLog.upsert).mockRejectedValueOnce(new Error('DB unreachable'));

      const job: MockJob = {
        id: 'test-job-3',
        name: 'send-template',
        queueName: 'whatsapp',
        attemptsMade: 0,
        opts: { attempts: 5 },
        data: {},
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(recordJobStart(job as any)).resolves.not.toThrow();
    });
  });

  describe('recordJobComplete', () => {
    it('updates JobLog with COMPLETED status + duration', async () => {
      const job: MockJob = {
        id: 'test-job-4',
        name: 'send-raw',
        queueName: 'email',
        attemptsMade: 0,
        opts: { attempts: 5 },
        data: {},
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await recordJobComplete(job as any, { messageId: 'abc' }, 1234);
      expect(prisma.jobLog.update).toHaveBeenCalledOnce();
      const call = vi.mocked(prisma.jobLog.update).mock.calls[0];
      expect(call?.[0]?.data).toMatchObject({
        status: 'COMPLETED',
        durationMs: 1234,
      });
    });
  });

  describe('recordJobFailure', () => {
    it('truncates error stack to 4KB', async () => {
      const job: MockJob = {
        id: 'test-job-5',
        name: 'send-raw',
        queueName: 'email',
        attemptsMade: 2,
        opts: { attempts: 5 },
        data: {},
      };

      const longError = new Error('a'.repeat(10_000));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await recordJobFailure(job as any, longError, 500);

      const call = vi.mocked(prisma.jobLog.update).mock.calls[0];
      const data = call?.[0]?.data as { error: string; errorStack: string };
      expect(data.error.length).toBeLessThanOrEqual(4000);
      expect(data.errorStack.length).toBeLessThanOrEqual(4000);
    });
  });
});
