// apps/web/__tests__/csp-integration.test.ts
// ═══════════════════════════════════════════════════════════════
// CSP INTEGRATION TEST — Multi-module pipeline test
// Validates that nonce.ts + policy.ts + reporting-endpoints.ts compose
// correctly end-to-end.
//
// This is NOT a browser E2E test (no Playwright in this repo); it's an
// integration test that exercises the full CSP build pipeline via direct
// module calls. Same level of confidence — minus rendering.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { generateNonce } from '@/lib/csp/nonce';
import { buildCspHeader } from '@/lib/csp/policy';
import { buildReportingEndpointsHeader, CSP_ENDPOINT_NAME } from '@/lib/csp/reporting-endpoints';

describe('CSP integration — nonce-based route flow', () => {
  it('end-to-end: nonce → build → reporting endpoint', () => {
    // 1. Generate per-request nonce.
    const nonce = generateNonce();
    expect(nonce).toHaveLength(24);

    // 2. Build CSP header with nonce.
    const csp = buildCspHeader({ mode: 'enforce', nonce });
    expect(csp.name).toBe('Content-Security-Policy');
    expect(csp.value).toContain(`'nonce-${nonce}'`);
    expect(csp.value).toContain("'strict-dynamic'");
    expect(csp.value).not.toMatch(/script-src[^;]+'unsafe-inline'/);
    expect(csp.value).not.toMatch(/'sha(256|384|512)-/);
    expect(csp.sizeLevel).toBe('ok');

    // 3. Reporting endpoint header references the same name as `report-to`.
    const reportingHeader = buildReportingEndpointsHeader();
    expect(reportingHeader).toContain(CSP_ENDPOINT_NAME);
    expect(csp.value).toContain(`report-to ${CSP_ENDPOINT_NAME}`);
  });

  it('every route class uses the same nonce-based policy shape', () => {
    // Nonce-only architecture: there is no longer a static/dynamic split.
    // A landing-page request and a consult-page request build the same
    // policy shape — only the per-request nonce value differs.
    const landingNonce = generateNonce();
    const consultNonce = generateNonce();

    const landing = buildCspHeader({ mode: 'enforce', nonce: landingNonce });
    const consult = buildCspHeader({ mode: 'enforce', nonce: consultNonce });

    // Same header name, same directive structure.
    expect(landing.name).toBe(consult.name);
    expect(landing.value.replace(landingNonce, 'N')).toBe(consult.value.replace(consultNonce, 'N'));
  });
});

describe('CSP integration — report-only mode (Phase 2 deployment)', () => {
  it('uses report-only header name, same policy content', () => {
    const nonce = generateNonce();
    const enforce = buildCspHeader({ mode: 'enforce', nonce });
    const reportOnly = buildCspHeader({ mode: 'report-only', nonce });

    expect(reportOnly.name).toBe('Content-Security-Policy-Report-Only');
    expect(enforce.name).toBe('Content-Security-Policy');
    expect(reportOnly.value).toBe(enforce.value);
  });
});
