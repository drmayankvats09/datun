// apps/api/src/__tests__/services/csp-report.service.test.ts
// ═══════════════════════════════════════════════════════════════
// CSP REPORT SERVICE — Unit tests
// Tests validation → dedup → DB persistence → severity → Sentry alert.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@repo/db';
import { Sentry } from '../../lib/sentry.js';
import { recordCspViolation } from '../../services/csp-report.service.js';
import { __resetDedupCache } from '../../services/csp-report-dedup.js';

beforeEach(() => {
  __resetDedupCache();
  vi.clearAllMocks();
});

const validLegacyPayload = {
  'csp-report': {
    'document-uri': 'https://datunai.com/en',
    'violated-directive': 'script-src',
    'effective-directive': 'script-src',
    'blocked-uri': 'https://evil.com/x.js',
    'original-policy': "default-src 'self'",
    disposition: 'enforce',
  },
};

describe('recordCspViolation — happy path', () => {
  it('persists a new violation via Prisma', async () => {
    await recordCspViolation({
      rawPayload: validLegacyPayload,
      contentType: 'application/csp-report',
      userAgent: 'Mozilla/5.0',
      ip: '1.2.3.4',
    });

    expect(prisma.cspViolation.create).toHaveBeenCalledTimes(1);
    const callArgs = (prisma.cspViolation.create as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(callArgs?.data).toMatchObject({
      blockedUri: 'https://evil.com/x.js',
      effectiveDirective: 'script-src',
      severity: 'critical', // script-src = critical
      dedupCount: 1,
    });
    // ipHash must NOT equal raw IP (privacy).
    expect(callArgs?.data?.ipHash).not.toBe('1.2.3.4');
    // ipHash should be SHA-256 hex (64 chars).
    expect(callArgs?.data?.ipHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('triggers Sentry alert for CRITICAL severity', async () => {
    await recordCspViolation({
      rawPayload: validLegacyPayload,
      contentType: 'application/csp-report',
      userAgent: null,
      ip: '1.2.3.4',
    });

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    const callArgs = (Sentry.captureMessage as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs?.[0]).toContain('[CSP CRITICAL]');
    expect(callArgs?.[1]).toBe('error');
  });

  it('does NOT alert Sentry for MEDIUM severity (style-src)', async () => {
    const stylePayload = {
      'csp-report': {
        ...validLegacyPayload['csp-report'],
        'violated-directive': 'style-src',
        'effective-directive': 'style-src',
      },
    };

    await recordCspViolation({
      rawPayload: stylePayload,
      contentType: 'application/csp-report',
      userAgent: null,
      ip: '1.2.3.4',
    });

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});

describe('recordCspViolation — dedup behavior', () => {
  it('second identical report does NOT create a new row', async () => {
    await recordCspViolation({
      rawPayload: validLegacyPayload,
      contentType: 'application/csp-report',
      userAgent: null,
      ip: '1.2.3.4',
    });
    await recordCspViolation({
      rawPayload: validLegacyPayload,
      contentType: 'application/csp-report',
      userAgent: null,
      ip: '1.2.3.4',
    });

    expect(prisma.cspViolation.create).toHaveBeenCalledTimes(1);
    expect(prisma.cspViolation.updateMany).toHaveBeenCalledTimes(1);
  });

  it('different IP → different ipHash → not deduped', async () => {
    await recordCspViolation({
      rawPayload: validLegacyPayload,
      contentType: 'application/csp-report',
      userAgent: null,
      ip: '1.2.3.4',
    });
    await recordCspViolation({
      rawPayload: validLegacyPayload,
      contentType: 'application/csp-report',
      userAgent: null,
      ip: '5.6.7.8',
    });

    expect(prisma.cspViolation.create).toHaveBeenCalledTimes(2);
  });
});

describe('recordCspViolation — error handling', () => {
  it('DB error is swallowed (no throw) and Sentry captures it', async () => {
    (prisma.cspViolation.create as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('DB connection refused'),
    );

    await expect(
      recordCspViolation({
        rawPayload: validLegacyPayload,
        contentType: 'application/csp-report',
        userAgent: null,
        ip: '1.2.3.4',
      }),
    ).resolves.toBeUndefined();

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
