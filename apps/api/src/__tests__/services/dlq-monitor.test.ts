// ═══════════════════════════════════════════════════════════════
// DLQ MONITOR TESTS — Threshold-based failure cluster detection
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@repo/db', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([]),
    jobLog: {
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

vi.mock('../../services/alert.service.js', () => ({
  alertAdmin: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '@repo/db';
import { scanDlqAndAlertWithStats } from '../../services/dlq-monitor.service.js';
import { alertAdmin } from '../../services/alert.service.js';

describe('DLQ Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero counts when no failures present', async () => {
    const result = await scanDlqAndAlertWithStats();
    expect(result.clustersFound).toBe(0);
    expect(result.alertsRaised).toBe(0);
  });

  it('raises WARNING alert when cluster threshold exceeded', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      {
        queueName: 'whatsapp',
        jobName: 'send-template',
        count: BigInt(15),
        sampleError: 'Meta API 429 Rate Limited',
      },
    ] as never);

    const result = await scanDlqAndAlertWithStats();
    expect(result.clustersFound).toBe(1);
    expect(result.alertsRaised).toBeGreaterThanOrEqual(1);
    expect(alertAdmin).toHaveBeenCalledWith(
      'WARNING',
      expect.stringContaining('whatsapp/send-template'),
      expect.stringContaining('Meta API 429'),
      expect.objectContaining({ alertKey: expect.stringContaining('whatsapp') }),
    );
  });

  it('raises CRITICAL alert when hourly total exceeds 50', async () => {
    vi.mocked(prisma.jobLog.count).mockResolvedValueOnce(75);

    const result = await scanDlqAndAlertWithStats();
    expect(result.hourlyTotal).toBe(75);
    expect(alertAdmin).toHaveBeenCalledWith(
      'CRITICAL',
      expect.stringContaining('Queue system degraded'),
      expect.stringContaining('75'),
      expect.objectContaining({ alertKey: 'dlq:system-degraded' }),
    );
  });

  it('does not crash when DB query fails', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('DB unavailable'));

    const result = await scanDlqAndAlertWithStats();
    expect(result.clustersFound).toBe(0);
    expect(result.alertsRaised).toBe(0);
  });
});
