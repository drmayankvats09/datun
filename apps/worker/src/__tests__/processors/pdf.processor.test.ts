// ═══════════════════════════════════════════════════════════════
// PDF PROCESSOR TESTS — Day 14 stub coverage
// Real generation logic comes in Task #58 — these tests lock the contract.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { processPdfJob } from '../../processors/pdf.processor.js';
import { PDF_JOB_NAMES } from '@repo/shared';

interface MockJob {
  id: string;
  name: string;
  data: unknown;
}

describe('PDF processor', () => {
  it('returns stub URL for consultation report job', async () => {
    const job: MockJob = {
      id: 'pdf-cons:abc-123',
      name: PDF_JOB_NAMES.CONSULTATION_REPORT,
      data: {
        consultationId: 'abc-123',
        userId: 'user-1',
        locale: 'en',
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPdfJob(job as any);
    expect(result.pdfUrl).toContain('abc-123');
    expect(result.pdfUrl).toMatch(/^https:/);
  });

  it('throws on unknown job name', async () => {
    const job: MockJob = {
      id: 'job-x',
      name: 'unknown',
      data: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(processPdfJob(job as any)).rejects.toThrow(/Unknown PDF job name/);
  });
});
