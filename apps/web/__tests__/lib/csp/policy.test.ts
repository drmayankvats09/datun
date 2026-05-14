// apps/web/__tests__/lib/csp/policy.test.ts
// ═══════════════════════════════════════════════════════════════
// CSP POLICY BUILDER — Unit tests (nonce-only architecture)
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildCspHeader } from '@/lib/csp/policy';

describe('CSP — buildCspHeader (enforce mode)', () => {
  const nonce = 'TEST_NONCE_abcdef1234567890==';

  it('returns Content-Security-Policy header name for enforce mode', () => {
    const { name } = buildCspHeader({ mode: 'enforce', nonce });
    expect(name).toBe('Content-Security-Policy');
  });

  it('includes the nonce in script-src', () => {
    const { value } = buildCspHeader({ mode: 'enforce', nonce });
    expect(value).toContain(`'nonce-${nonce}'`);
  });

  it('includes strict-dynamic in script-src', () => {
    const { value } = buildCspHeader({ mode: 'enforce', nonce });
    expect(value).toMatch(/script-src[^;]+'strict-dynamic'/);
  });

  it('NEVER includes unsafe-inline in script-src', () => {
    const { value } = buildCspHeader({ mode: 'enforce', nonce });
    expect(value).not.toMatch(/script-src[^;]+'unsafe-inline'/);
  });

  it('NEVER includes unsafe-eval', () => {
    const { value } = buildCspHeader({ mode: 'enforce', nonce });
    expect(value).not.toContain("'unsafe-eval'");
  });

  it('NEVER includes a sha256/384/512 hash token in script-src', () => {
    // Nonce-only architecture: hash-based CSP was removed in Phase 3.
    const { value } = buildCspHeader({ mode: 'enforce', nonce });
    expect(value).not.toMatch(/'sha(256|384|512)-/);
  });

  it('includes object-src none (hard block)', () => {
    const { value } = buildCspHeader({ mode: 'enforce', nonce });
    expect(value).toContain("object-src 'none'");
  });

  it('includes frame-ancestors none (clickjack defense)', () => {
    const { value } = buildCspHeader({ mode: 'enforce', nonce });
    expect(value).toContain("frame-ancestors 'none'");
  });

  it('includes base-uri self', () => {
    const { value } = buildCspHeader({ mode: 'enforce', nonce });
    expect(value).toContain("base-uri 'self'");
  });

  it('includes upgrade-insecure-requests', () => {
    const { value } = buildCspHeader({ mode: 'enforce', nonce });
    expect(value).toContain('upgrade-insecure-requests');
  });

  it('emits report-to AND report-uri (dual reporting)', () => {
    const { value } = buildCspHeader({ mode: 'enforce', nonce });
    expect(value).toContain('report-to csp-endpoint');
    expect(value).toContain('report-uri https://api.datunai.com/api/security/csp-report');
  });

  it('throws if nonce is missing', () => {
    // Simulate a JS caller that omits the required `nonce` field.
    // @ts-expect-error — `nonce` is intentionally omitted to exercise the runtime guard.
    expect(() => buildCspHeader({ mode: 'enforce' })).toThrow(
      /a per-request nonce is required/,
    );
  });

  it('throws if nonce is an empty string', () => {
    expect(() => buildCspHeader({ mode: 'enforce', nonce: '' })).toThrow(
      /a per-request nonce is required/,
    );
  });
});

describe('CSP — buildCspHeader (report-only mode)', () => {
  it('returns Content-Security-Policy-Report-Only header name', () => {
    const { name } = buildCspHeader({ mode: 'report-only', nonce: 'test' });
    expect(name).toBe('Content-Security-Policy-Report-Only');
  });

  it('has identical policy value to enforce mode (only header name differs)', () => {
    const nonce = 'sameNonce123';
    const enforce = buildCspHeader({ mode: 'enforce', nonce });
    const reportOnly = buildCspHeader({ mode: 'report-only', nonce });
    expect(reportOnly.value).toBe(enforce.value);
  });
});

describe('CSP — buildCspHeader (size guard integration)', () => {
  it('reports size level as "ok" for normal policies', () => {
    const { sizeLevel } = buildCspHeader({ mode: 'enforce', nonce: 'x' });
    expect(sizeLevel).toBe('ok');
  });
});

// ── Property tests ─────────────────────────────────────────────
// Uses plain fast-check (root devDependency) with vitest's `it()`.

describe('CSP — property tests', () => {
  it('unsafe-inline NEVER appears in script-src for ANY nonce', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (nonce: string) => {
        const { value } = buildCspHeader({ mode: 'enforce', nonce });
        expect(value).not.toMatch(/script-src[^;]+'unsafe-inline'/);
      }),
      { numRuns: 100 },
    );
  });

  it('every built header carries exactly the provided nonce', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (nonce: string) => {
        const { value } = buildCspHeader({ mode: 'enforce', nonce });
        expect(value).toContain(`'nonce-${nonce}'`);
      }),
      { numRuns: 100 },
    );
  });
});
