// ═══════════════════════════════════════════════════════════════
// EMAIL PROCESSOR TESTS
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    RESEND_API_KEY: 'test-resend-key',
    RESEND_FROM_DOMAIN: 'datunai.com',
  },
}));

import { processEmailJob } from '../../processors/email.processor.js';
import { EMAIL_JOB_NAMES } from '@repo/shared';

interface MockJob {
  id: string;
  name: string;
  data: unknown;
}

describe('Email processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends raw email via Resend on send-raw job', async () => {
    const job: MockJob = {
      id: 'job-1',
      name: EMAIL_JOB_NAMES.SEND_RAW,
      data: {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processEmailJob(job as any);
    expect(result.providerMessageId).toBe('mock-resend-id');
  });

  it('sends templated email on send-templated job', async () => {
    const job: MockJob = {
      id: 'job-2',
      name: EMAIL_JOB_NAMES.SEND_TEMPLATED,
      data: {
        to: 'user@example.com',
        template: 'welcome',
        vars: { name: 'Test User' },
        userId: 'user-1',
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processEmailJob(job as any);
    expect(result.providerMessageId).toBe('mock-resend-id');
  });

  it('throws on unknown job name', async () => {
    const job: MockJob = {
      id: 'job-3',
      name: 'unknown',
      data: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(processEmailJob(job as any)).rejects.toThrow(/Unknown email job name/);
  });
});
