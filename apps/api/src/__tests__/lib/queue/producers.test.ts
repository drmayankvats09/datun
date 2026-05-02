// ═══════════════════════════════════════════════════════════════
// QUEUE PRODUCERS TESTS — Enqueue contract + trace propagation
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  enqueueWhatsAppTemplate,
  enqueueWhatsAppText,
  enqueueEmailTemplated,
  enqueueEmailRaw,
  enqueueConsultationPdf,
} from '../../../lib/queue/producers.js';
import { getQueue } from '../../../lib/queue/queues.js';

vi.mock('../../../lib/queue/queues.js', () => ({
  getQueue: vi.fn(),
  getAllQueues: vi.fn().mockReturnValue([]),
  closeAllQueues: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../lib/request-context.js', () => ({
  getRequestId: vi.fn().mockReturnValue('system'),
}));

describe('Queue producers', () => {
  let mockQueue: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
    };
    vi.mocked(getQueue).mockReturnValue(mockQueue as never);
  });

  describe('enqueueWhatsAppTemplate', () => {
    it('returns ok=true with jobId and traceId on success', async () => {
      const result = await enqueueWhatsAppTemplate({
        phone: '+919999135340',
        templateName: 'consultation_complete',
        userId: 'user-1',
        consultationId: 'cons-1',
      });
      expect(result.ok).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.traceId).toMatch(/^trc_[a-f0-9]{16}$/);
      expect(mockQueue.add).toHaveBeenCalledOnce();
    });

    it('uses idempotent jobId derived from inputs', async () => {
      await enqueueWhatsAppTemplate({
        phone: '+919999135340',
        templateName: 'welcome',
        userId: 'user-1',
        consultationId: 'cons-1',
      });
      const callArgs = mockQueue.add.mock.calls[0];
      const jobOpts = callArgs?.[2] as { jobId?: string };
      expect(jobOpts.jobId).toMatch(/wa-tpl:user-1:welcome:cons-1/);
    });

    it('preserves caller-provided traceId', async () => {
      const customTrace = 'trc_caller000000000';
      await enqueueWhatsAppTemplate({
        phone: '+919999135340',
        templateName: 'welcome',
        userId: 'user-1',
        traceId: customTrace,
      });
      const payload = mockQueue.add.mock.calls[0]?.[1] as { traceId?: string };
      expect(payload.traceId).toBe(customTrace);
    });

    it('returns ok=false when queue not configured', async () => {
      vi.mocked(getQueue).mockReturnValueOnce(null);
      const result = await enqueueWhatsAppTemplate({
        phone: '+919999135340',
        templateName: 'welcome',
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('not configured');
    });

    it('captures and reports queue.add failures', async () => {
      mockQueue.add.mockRejectedValueOnce(new Error('Redis unavailable'));
      const result = await enqueueWhatsAppTemplate({
        phone: '+919999135340',
        templateName: 'welcome',
        userId: 'user-1',
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Redis unavailable');
    });

    it('honors delay option', async () => {
      await enqueueWhatsAppTemplate(
        {
          phone: '+919999135340',
          templateName: 'reminder',
          userId: 'user-1',
        },
        { delay: 60_000 },
      );
      const callArgs = mockQueue.add.mock.calls[0];
      const jobOpts = callArgs?.[2] as { delay?: number };
      expect(jobOpts.delay).toBe(60_000);
    });
  });

  describe('enqueueWhatsAppText', () => {
    it('uses 24hr-window-aware idempotency bucket', async () => {
      const result = await enqueueWhatsAppText({
        phone: '+919999135340',
        body: 'Hello',
      });
      expect(result.ok).toBe(true);
      const callArgs = mockQueue.add.mock.calls[0];
      const jobOpts = callArgs?.[2] as { jobId?: string };
      expect(jobOpts.jobId).toMatch(/wa-txt:/);
    });
  });

  describe('enqueueEmailTemplated', () => {
    it('produces job with correct queue + name', async () => {
      const result = await enqueueEmailTemplated({
        to: 'user@example.com',
        template: 'welcome',
        vars: { name: 'Test' },
        userId: 'user-1',
      });
      expect(result.ok).toBe(true);
      const callArgs = mockQueue.add.mock.calls[0];
      expect(callArgs?.[0]).toBe('send-templated');
    });

    it('idempotent: same call twice = same jobId', async () => {
      const result1 = await enqueueEmailTemplated({
        to: 'user@example.com',
        template: 'welcome',
        vars: { name: 'Test' },
        consultationId: 'cons-1',
      });
      const result2 = await enqueueEmailTemplated({
        to: 'user@example.com',
        template: 'welcome',
        vars: { name: 'Test' },
        consultationId: 'cons-1',
      });
      expect(result1.jobId).toBe(result2.jobId);
    });

    it('injects traceId into payload', async () => {
      await enqueueEmailTemplated({
        to: 'user@example.com',
        template: 'welcome',
        vars: { name: 'Test' },
      });
      const payload = mockQueue.add.mock.calls[0]?.[1] as { traceId?: string };
      expect(payload.traceId).toMatch(/^trc_[a-f0-9]{16}$/);
    });
  });

  describe('enqueueEmailRaw', () => {
    it('returns ok=true on success', async () => {
      const result = await enqueueEmailRaw({
        to: 'admin@example.com',
        subject: 'Alert',
        html: '<p>Body</p>',
      });
      expect(result.ok).toBe(true);
    });
  });

  describe('enqueueConsultationPdf', () => {
    it('one consultation = one canonical jobId', async () => {
      await enqueueConsultationPdf({
        consultationId: 'cons-abc',
        userId: 'user-1',
        locale: 'en',
      });
      const callArgs = mockQueue.add.mock.calls[0];
      const jobOpts = callArgs?.[2] as { jobId?: string };
      expect(jobOpts.jobId).toBe('pdf-cons:cons-abc');
    });

    it('every PDF job carries traceId for downstream correlation', async () => {
      await enqueueConsultationPdf({
        consultationId: 'cons-abc',
        userId: 'user-1',
        locale: 'en',
      });
      const payload = mockQueue.add.mock.calls[0]?.[1] as { traceId?: string };
      expect(payload.traceId).toMatch(/^trc_[a-f0-9]{16}$/);
    });
  });
});
