// apps/web/__tests__/lib/csp/allowed-origins.test.ts
// ═══════════════════════════════════════════════════════════════
// CSP ALLOWED-ORIGINS — Security invariant tests
// These tests act as a "tripwire" — if anyone adds an insecure origin,
// CI fails before the change can ship.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  SCRIPT_SRC_ORIGINS,
  STYLE_SRC_ORIGINS,
  FONT_SRC_ORIGINS,
  IMG_SRC_ORIGINS,
  CONNECT_SRC_ORIGINS,
  FRAME_SRC_ORIGINS,
  ALL_ORIGINS,
  REPORT_ENDPOINT_URL,
} from '@/lib/csp/allowed-origins';

describe('CSP — allowed-origins (security invariants)', () => {
  it('every origin uses https:// (no http://)', () => {
    for (const origin of ALL_ORIGINS) {
      expect(origin.startsWith('https://')).toBe(true);
    }
  });

  it('no bare wildcard `*` or `https://*`', () => {
    for (const origin of ALL_ORIGINS) {
      expect(origin).not.toBe('*');
      expect(origin).not.toBe('https://*');
    }
  });

  it('no `data:` or `blob:` schemes in script/connect/frame (those go via policy.ts)', () => {
    const sensitive = [...SCRIPT_SRC_ORIGINS, ...CONNECT_SRC_ORIGINS, ...FRAME_SRC_ORIGINS];
    for (const origin of sensitive) {
      expect(origin.startsWith('data:')).toBe(false);
      expect(origin.startsWith('blob:')).toBe(false);
    }
  });

  it('no localhost or 127.0.0.1 in production set', () => {
    for (const origin of ALL_ORIGINS) {
      expect(origin).not.toContain('localhost');
      expect(origin).not.toContain('127.0.0.1');
    }
  });

  it('report endpoint is HTTPS', () => {
    expect(REPORT_ENDPOINT_URL.startsWith('https://')).toBe(true);
  });

  it('report endpoint points to api.datunai.com', () => {
    expect(REPORT_ENDPOINT_URL).toContain('api.datunai.com');
  });

  it('Sentry origins include both browser-cdn and ingest endpoints', () => {
    expect(SCRIPT_SRC_ORIGINS.some((o) => o.includes('sentry-cdn.com'))).toBe(true);
    expect(CONNECT_SRC_ORIGINS.some((o) => o.includes('sentry.io'))).toBe(true);
  });

  it('Cloudinary origin present for images', () => {
    expect(IMG_SRC_ORIGINS).toContain('https://res.cloudinary.com');
  });

  it('Google Fonts in style + font src', () => {
    expect(STYLE_SRC_ORIGINS).toContain('https://fonts.googleapis.com');
    expect(FONT_SRC_ORIGINS).toContain('https://fonts.gstatic.com');
  });

  it('Datun API present in connect-src', () => {
    expect(CONNECT_SRC_ORIGINS).toContain('https://api.datunai.com');
  });

  // ── Wildcard usage is tightly controlled ──
  it('wildcards (if any) target specific subdomains, not generic TLDs', () => {
    const wildcards = ALL_ORIGINS.filter((o) => o.includes('*'));
    for (const w of wildcards) {
      // Acceptable: https://*.sentry.io, https://*.cloudflare.com
      // Unacceptable: https://*, https://*.io, https://example.*
      expect(w).toMatch(/^https:\/\/\*\.[a-z0-9-]+\.[a-z]{2,}/);
    }
  });
});
