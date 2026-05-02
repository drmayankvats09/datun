// ═══════════════════════════════════════════════════════════════
// SCHEDULED PROCESSOR TESTS
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    HEALTHCHECK_3DAY_URL: 'https://hc-ping.com/test-3day',
    HEALTHCHECK_7DAY_URL: 'https://hc-ping.com/test-7day',
    HEALTHCHECK_DAILY_REPORT_URL: 'https://hc-ping.com/test-daily',
    HEALTHCHECK_WHATSAPP_URL: 'https://hc-ping.com/test-wa',
  },
}));

import { processScheduledJob } from '../../processors/scheduled.processor.js';
import { SCHEDULED_JOB_NAMES } from '@repo/shared';

interface MockJob {
  id: string;
  name: string;
  data: unknown;
}

describe('Scheduled processor', () => {
  it('handles 3-day followup tick', async () => {
    const job: MockJob = {
      id: 'sched-1',
      name: SCHEDULED_JOB_NAMES.FOLLOWUP_3DAY,
      data: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processScheduledJob(job as any);
    expect(result.ok).toBe(true);
  });

  it('handles 7-day followup tick', async () => {
    const job: MockJob = {
      id: 'sched-2',
      name: SCHEDULED_JOB_NAMES.FOLLOWUP_7DAY,
      data: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processScheduledJob(job as any);
    expect(result.ok).toBe(true);
  });

  it('handles daily report tick', async () => {
    const job: MockJob = {
      id: 'sched-3',
      name: SCHEDULED_JOB_NAMES.DAILY_REPORT,
      data: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processScheduledJob(job as any);
    expect(result.ok).toBe(true);
  });

  it('handles WhatsApp heartbeat tick', async () => {
    const job: MockJob = {
      id: 'sched-4',
      name: SCHEDULED_JOB_NAMES.WHATSAPP_HEARTBEAT,
      data: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processScheduledJob(job as any);
    expect(result.ok).toBe(true);
  });

  it('throws on unknown job name', async () => {
    const job: MockJob = {
      id: 'sched-x',
      name: 'unknown',
      data: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(processScheduledJob(job as any)).rejects.toThrow(/Unknown scheduled job name/);
  });
});
