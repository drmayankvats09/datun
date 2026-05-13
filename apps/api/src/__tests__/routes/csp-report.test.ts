// apps/api/src/__tests__/routes/csp-report.test.ts
// ═══════════════════════════════════════════════════════════════
// CSP REPORT ROUTER — Integration tests
// Service is mocked — focus is on routing + content-type + rate limit.
// ═══════════════════════════════════════════════════════════════

import { vi } from 'vitest';

vi.mock('../../services/csp-report.service.js', () => ({
  recordCspViolation: vi.fn().mockResolvedValue(undefined),
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestApp, resetTestApp } from '../helpers/test-app.js';
import { recordCspViolation } from '../../services/csp-report.service.js';

beforeEach(() => {
  resetTestApp();
  vi.clearAllMocks();
});

describe('POST /api/security/csp-report (legacy format)', () => {
  it('accepts application/csp-report and returns 204', async () => {
    const payload = {
      'csp-report': {
        'document-uri': 'https://datunai.com/en',
        'violated-directive': 'script-src',
        'effective-directive': 'script-src',
        'blocked-uri': 'https://evil.com/x.js',
        'original-policy': "default-src 'self'",
      },
    };

    const res = await getTestApp()
      .post('/api/security/csp-report')
      .set('Content-Type', 'application/csp-report')
      .send(JSON.stringify(payload));

    expect(res.status).toBe(204);
    expect(recordCspViolation).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/security/csp-report (modern Reporting API)', () => {
  it('accepts application/reports+json and returns 204', async () => {
    const payload = [
      {
        type: 'csp-violation',
        age: 0,
        url: 'https://datunai.com/en',
        body: {
          blockedURL: 'https://evil.com/y.js',
          effectiveDirective: 'script-src',
          violatedDirective: 'script-src',
          originalPolicy: "default-src 'self'",
        },
      },
    ];

    const res = await getTestApp()
      .post('/api/security/csp-report')
      .set('Content-Type', 'application/reports+json')
      .send(JSON.stringify(payload));

    expect(res.status).toBe(204);
    expect(recordCspViolation).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/security/csp-report (rejects malformed)', () => {
  it('returns 400 on completely unrecognized body', async () => {
    const { ValidationError } = await import('../../errors/index.js');
    (recordCspViolation as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new ValidationError('CSP report payload did not match any known format'),
    );

    const res = await getTestApp()
      .post('/api/security/csp-report')
      .set('Content-Type', 'application/csp-report')
      .send(JSON.stringify({ random: 'garbage' }));

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });
});

describe('POST /api/security/csp-report — no auth required', () => {
  it('accepts request without Authorization header', async () => {
    const res = await getTestApp()
      .post('/api/security/csp-report')
      .set('Content-Type', 'application/csp-report')
      .send(JSON.stringify({ 'csp-report': { 'blocked-uri': 'https://x.com' } }));
    expect(res.status).not.toBe(401);
  });
});
