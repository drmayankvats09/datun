// ═══════════════════════════════════════════════════════════════
// WHATSAPP PROCESSOR TESTS
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WHATSAPP_ENABLED: true,
    WHATSAPP_TOKEN: 'test-token',
    WHATSAPP_PHONE_NUMBER_ID: 'test-phone-id',
  },
}));

import axios from 'axios';
import { processWhatsAppJob } from '../../processors/whatsapp.processor.js';
import { WHATSAPP_JOB_NAMES } from '@repo/shared';

interface MockJob {
  id: string;
  name: string;
  data: unknown;
}

describe('WhatsApp processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends template via Meta Cloud API on send-template job', async () => {
    const job: MockJob = {
      id: 'job-1',
      name: WHATSAPP_JOB_NAMES.SEND_TEMPLATE,
      data: {
        phone: '+919999135340',
        templateName: 'consultation_complete',
        userId: 'user-1',
        consultationId: 'cons-1',
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processWhatsAppJob(job as any);
    expect(result.providerMessageId).toBe('mock-meta-msg-id');
    expect(axios.post).toHaveBeenCalledOnce();

    const call = vi.mocked(axios.post).mock.calls[0];
    expect(call?.[0]).toContain('graph.facebook.com');
    expect(call?.[1]).toMatchObject({
      messaging_product: 'whatsapp',
      to: '+919999135340',
      type: 'template',
    });
  });

  it('sends text via Meta Cloud API on send-text job', async () => {
    const job: MockJob = {
      id: 'job-2',
      name: WHATSAPP_JOB_NAMES.SEND_TEXT,
      data: {
        phone: '+919999135340',
        body: 'Hello world',
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processWhatsAppJob(job as any);
    expect(result.providerMessageId).toBe('mock-meta-msg-id');
  });

  it('throws on unknown job name', async () => {
    const job: MockJob = {
      id: 'job-3',
      name: 'unknown-name',
      data: { phone: '+919999135340' },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(processWhatsAppJob(job as any)).rejects.toThrow(/Unknown WhatsApp job name/);
  });

  it('propagates Meta API errors so BullMQ retries', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(
      Object.assign(new Error('429 Rate limited'), {
        response: { status: 429, data: { error: 'rate_limited' } },
      }),
    );

    const job: MockJob = {
      id: 'job-4',
      name: WHATSAPP_JOB_NAMES.SEND_TEXT,
      data: { phone: '+919999135340', body: 'x' },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(processWhatsAppJob(job as any)).rejects.toThrow(/Rate limited/);
  });
});
