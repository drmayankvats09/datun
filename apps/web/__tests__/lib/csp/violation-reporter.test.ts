// apps/web/__tests__/lib/csp/violation-reporter.test.ts
// ═══════════════════════════════════════════════════════════════
// VIOLATION REPORTER — Unit tests
// Tests session counter, fetch handling, idempotency.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initViolationReporter, __resetSessionCount } from '@/lib/csp/violation-reporter';

describe('CSP — initViolationReporter', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    __resetSessionCount();
    // Reset window flags between tests.
    if (typeof window !== 'undefined') {
      window.__cspReporterInitialized = false;
      window.__cspReporterCleanup = undefined;
    }
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns a cleanup function', () => {
    const cleanup = initViolationReporter();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('is idempotent — second call returns existing cleanup, no double-listener', () => {
    const cleanup1 = initViolationReporter();
    const cleanup2 = initViolationReporter();
    // Both should be the same cleanup function reference.
    expect(cleanup1).toBe(cleanup2);
    cleanup1();
  });

  it('POSTs to API on securitypolicyviolation event', async () => {
    const cleanup = initViolationReporter();

    const event = new Event('securitypolicyviolation') as SecurityPolicyViolationEvent;
    Object.assign(event, {
      documentURI: 'https://datunai.com/',
      referrer: '',
      violatedDirective: 'script-src',
      effectiveDirective: 'script-src',
      originalPolicy: "default-src 'self'",
      disposition: 'enforce',
      blockedURI: 'https://evil.com/x.js',
      lineNumber: 0,
      columnNumber: 0,
      sourceFile: '',
      statusCode: 0,
      sample: '',
    });

    document.dispatchEvent(event);

    // Wait a tick for the async fetch.
    await new Promise((r) => setTimeout(r, 0));

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs?.[0]).toContain('csp-report');
    expect(callArgs?.[1]?.method).toBe('POST');
    expect(callArgs?.[1]?.headers).toEqual(
      expect.objectContaining({ 'Content-Type': 'application/csp-report' }),
    );

    cleanup();
  });

  it('stops sending after MAX_REPORTS_PER_SESSION (10)', async () => {
    const cleanup = initViolationReporter();

    for (let i = 0; i < 15; i++) {
      const event = new Event('securitypolicyviolation') as SecurityPolicyViolationEvent;
      Object.assign(event, {
        documentURI: 'https://datunai.com/',
        violatedDirective: 'script-src',
        effectiveDirective: 'script-src',
        blockedURI: `https://evil${i}.com/x.js`,
      });
      document.dispatchEvent(event);
    }

    await new Promise((r) => setTimeout(r, 0));

    expect(globalThis.fetch).toHaveBeenCalledTimes(10);
    cleanup();
  });

  it('swallows fetch errors silently', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'));
    const cleanup = initViolationReporter();

    const event = new Event('securitypolicyviolation') as SecurityPolicyViolationEvent;
    Object.assign(event, { documentURI: '/', violatedDirective: 'script-src' });

    // Should not throw.
    expect(() => document.dispatchEvent(event)).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));

    cleanup();
  });
});
