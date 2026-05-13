// apps/web/__tests__/csp-integration.test.ts
// ═══════════════════════════════════════════════════════════════
// CSP INTEGRATION TEST — Multi-module pipeline test
// Validates that policy.ts + route-classification.ts + reporting-endpoints.ts
// compose correctly end-to-end.
//
// This is NOT a browser E2E test (no Playwright in this repo); it's an
// integration test that exercises the full CSP build pipeline via direct
// module calls. Same level of confidence — minus rendering.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { generateNonce } from '@/lib/csp/nonce';
import { buildCspHeader } from '@/lib/csp/policy';
import { buildReportingEndpointsHeader, CSP_ENDPOINT_NAME } from '@/lib/csp/reporting-endpoints';
import { classifyRoute } from '@/lib/csp/route-classification';
import { INLINE_SCRIPT_HASHES } from '@/lib/csp/inline-hashes';

describe('CSP integration — dynamic route flow', () => {
  it('end-to-end: classify → nonce → build → reporting endpoint', () => {
    // 1. Classify a typical dynamic route.
    const pathname = '/en/consult/abc-123';
    const routeType = classifyRoute(pathname);
    expect(routeType).toBe('dynamic');

    // 2. Generate per-request nonce.
    const nonce = generateNonce();
    expect(nonce).toHaveLength(24);

    // 3. Build CSP header with nonce.
    const csp = buildCspHeader({ mode: 'enforce', routeType, nonce });
    expect(csp.name).toBe('Content-Security-Policy');
    expect(csp.value).toContain(`'nonce-${nonce}'`);
    expect(csp.value).toContain("'strict-dynamic'");
    expect(csp.value).not.toMatch(/script-src[^;]+''unsafe-inline''/);
    expect(csp.sizeLevel).toBe('ok');

    // 4. Reporting endpoint header references the same name as `report-to`.
    const reportingHeader = buildReportingEndpointsHeader();
    expect(reportingHeader).toContain(CSP_ENDPOINT_NAME);
    expect(csp.value).toContain(`report-to ${CSP_ENDPOINT_NAME}`);
  });
});

describe('CSP integration — static route flow', () => {
  it('end-to-end: classify → hashes → build', () => {
    const pathname = '/en/privacy';
    const routeType = classifyRoute(pathname);
    expect(routeType).toBe('static');

    const csp = buildCspHeader({
      mode: 'enforce',
      routeType,
      hashes: INLINE_SCRIPT_HASHES,
    });
    expect(csp.name).toBe('Content-Security-Policy');
    expect(csp.value).not.toContain("'nonce-");
    // If registry has entries (post-build), they should appear.
    for (const hash of INLINE_SCRIPT_HASHES) {
      expect(csp.value).toContain(`'${hash}'`);
    }
  });
});

describe('CSP integration — report-only mode (Phase 2 deployment)', () => {
  it('uses report-only header name, same policy content', () => {
    const nonce = generateNonce();
    const enforce = buildCspHeader({ mode: 'enforce', routeType: 'dynamic', nonce });
    const reportOnly = buildCspHeader({ mode: 'report-only', routeType: 'dynamic', nonce });

    expect(reportOnly.name).toBe('Content-Security-Policy-Report-Only');
    expect(enforce.name).toBe('Content-Security-Policy');
    expect(reportOnly.value).toBe(enforce.value);
  });
});
