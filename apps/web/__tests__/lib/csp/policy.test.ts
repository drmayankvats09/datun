// apps/web/__tests__/lib/csp/policy.test.ts
// ═══════════════════════════════════════════════════════════════
// CSP POLICY BUILDER — Unit tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildCspHeader } from '@/lib/csp/policy';

describe('CSP — buildCspHeader (enforce, dynamic)', () => {
  const nonce = 'TEST_NONCE_abcdef1234567890==';

  it('returns Content-Security-Policy header name for enforce mode', () => {
    const { name } = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
    expect(name).toBe('Content-Security-Policy');
  });

  it('includes the nonce in script-src', () => {
    const { value } = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
    expect(value).toContain(`'nonce-${nonce}'`);
  });

  it('includes strict-dynamic in script-src', () => {
    const { value } = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
    expect(value).toMatch(/script-src[^;]+'strict-dynamic'/);
  });

  it('NEVER includes unsafe-inline in script-src', () => {
    const { value } = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
    expect(value).not.toMatch(/script-src[^;]+'unsafe-inline'/);
  });

  it('NEVER includes unsafe-eval', () => {
    const { value } = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
    expect(value).not.toContain("'unsafe-eval'");
  });

  it('includes object-src none (hard block)', () => {
    const { value } = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
    expect(value).toContain("object-src 'none'");
  });

  it('includes frame-ancestors none (clickjack defense)', () => {
    const { value } = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
    expect(value).toContain("frame-ancestors 'none'");
  });

  it('includes base-uri self', () => {
    const { value } = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
    expect(value).toContain("base-uri 'self'");
  });

  it('includes upgrade-insecure-requests', () => {
    const { value } = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
    expect(value).toContain('upgrade-insecure-requests');
  });

  it('emits report-to AND report-uri (dual reporting)', () => {
    const { value } = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
    expect(value).toContain('report-to csp-endpoint');
    expect(value).toContain('report-uri https://api.datunai.com/api/security/csp-report');
  });

  it('throws if dynamic mode lacks nonce', () => {
    expect(() => buildCspHeader({ mode: 'enforce', routeType: 'dynamic' })).toThrow(
      /dynamic route requires a nonce/,
    );
  });
});

describe('CSP — buildCspHeader (report-only mode)', () => {
  it('returns Content-Security-Policy-Report-Only header name', () => {
    const { name } = buildCspHeader({
      mode: 'report-only',
      routeType: 'dynamic',
      nonce: 'test',
    });
    expect(name).toBe('Content-Security-Policy-Report-Only');
  });

  it('has identical policy value to enforce mode (only header name differs)', () => {
    const nonce = 'sameNonce123';
    const enforce = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
    const reportOnly = buildCspHeader({ mode: 'report-only', routeType: 'dynamic', nonce });
    expect(reportOnly.value).toBe(enforce.value);
  });
});

describe('CSP — buildCspHeader (static, hash-based)', () => {
  const hashes = ['sha256-abc123==', 'sha256-def456=='];

  it('throws if hashes is undefined', () => {
    expect(() => buildCspHeader({ mode: 'enforce', routeType: 'static' })).toThrow(
      /static route requires a hashes array/,
    );
  });

  it('accepts empty hashes array (no inline scripts)', () => {
    const { value } = buildCspHeader({ mode: 'enforce', routeType: 'static', hashes: [] });
    // Should still build successfully — just no `'sha256-...'` entries.
    expect(value).toContain('script-src');
    expect(value).not.toContain("'nonce-");
  });

  it('includes each provided hash in script-src', () => {
    const { value } = buildCspHeader({ mode: 'enforce', routeType: 'static', hashes });
    expect(value).toContain("'sha256-abc123=='");
    expect(value).toContain("'sha256-def456=='");
  });

  it('does NOT include a nonce for static routes', () => {
    const { value } = buildCspHeader({ mode: 'enforce', routeType: 'static', hashes });
    expect(value).not.toContain("'nonce-");
  });
});

describe('CSP — buildCspHeader (size guard integration)', () => {
  it('reports size level as "ok" for normal policies', () => {
    const { sizeLevel } = buildCspHeader({
      mode: 'enforce',
      routeType: 'dynamic',
      nonce: 'x',
    });
    expect(sizeLevel).toBe('ok');
  });
});

// ── Property tests ─────────────────────────────────────────────
// Uses plain fast-check@4.7.0 (root devDependency) with vitest's `it()`.
// No need for the separate @fast-check/vitest adapter package.

describe('CSP — property tests', () => {
  it('unsafe-inline NEVER appears for ANY nonce in dynamic mode', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (nonce) => {
        const { value } = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
        expect(value).not.toMatch(/script-src[^;]+'unsafe-inline'/);
      }),
      { numRuns: 100 },
    );
  });

  it('static mode never emits a nonce regardless of hash count', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 5, maxLength: 50 }), { maxLength: 20 }),
        (hashes) => {
          const { value } = buildCspHeader({ mode: 'enforce', routeType: 'static', hashes });
          expect(value).not.toContain("'nonce-");
        },
      ),
      { numRuns: 100 },
    );
  });
});
