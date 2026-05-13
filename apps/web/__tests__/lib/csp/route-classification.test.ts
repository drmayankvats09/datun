// apps/web/__tests__/lib/csp/route-classification.test.ts
// ═══════════════════════════════════════════════════════════════
// ROUTE CLASSIFICATION — Unit tests
// Pattern: covers all Datun's 10 locales × multiple page types.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { classifyRoute, __testing__ } from '@/lib/csp/route-classification';

describe('CSP — classifyRoute', () => {
  describe('static routes', () => {
    it('classifies root `/` as static', () => {
      expect(classifyRoute('/')).toBe('static');
    });

    it('classifies locale roots as static', () => {
      expect(classifyRoute('/en')).toBe('static');
      expect(classifyRoute('/hi')).toBe('static');
      expect(classifyRoute('/ta')).toBe('static');
      expect(classifyRoute('/te')).toBe('static');
      expect(classifyRoute('/bn')).toBe('static');
      expect(classifyRoute('/gu')).toBe('static');
      expect(classifyRoute('/kn')).toBe('static');
      expect(classifyRoute('/ml')).toBe('static');
      expect(classifyRoute('/mr')).toBe('static');
      expect(classifyRoute('/pa')).toBe('static');
    });

    it('classifies locale roots with trailing slash', () => {
      expect(classifyRoute('/en/')).toBe('static');
      expect(classifyRoute('/hi/')).toBe('static');
    });

    it('classifies legal pages as static (all locales)', () => {
      expect(classifyRoute('/en/privacy')).toBe('static');
      expect(classifyRoute('/hi/terms')).toBe('static');
      expect(classifyRoute('/ta/cookies')).toBe('static');
      expect(classifyRoute('/te/dpdp-notice')).toBe('static');
    });

    it('handles trailing slash on legal pages', () => {
      expect(classifyRoute('/en/privacy/')).toBe('static');
    });
  });

  describe('dynamic routes (default)', () => {
    it('classifies auth routes as dynamic', () => {
      expect(classifyRoute('/en/login')).toBe('dynamic');
      expect(classifyRoute('/en/signup')).toBe('dynamic');
      expect(classifyRoute('/en/forgot-password')).toBe('dynamic');
    });

    it('classifies consult routes as dynamic', () => {
      expect(classifyRoute('/en/consult/abc-123')).toBe('dynamic');
    });

    it('classifies admin routes as dynamic', () => {
      expect(classifyRoute('/en/admin/label')).toBe('dynamic');
      expect(classifyRoute('/en/admin/security')).toBe('dynamic');
    });

    it('classifies OAuth callback as dynamic', () => {
      expect(classifyRoute('/auth/google/callback')).toBe('dynamic');
    });

    it('classifies unknown paths as dynamic (safe default)', () => {
      expect(classifyRoute('/some/random/path')).toBe('dynamic');
      expect(classifyRoute('/blog/post-123')).toBe('dynamic');
      expect(classifyRoute('/dentists-in-delhi')).toBe('dynamic');
    });
  });

  describe('edge cases', () => {
    it('does NOT match locale-like paths with extra junk', () => {
      expect(classifyRoute('/en/privacy-policy-extra')).toBe('dynamic');
      expect(classifyRoute('/en-US/privacy')).toBe('dynamic'); // 5-char locale isn't ours
    });

    it('does NOT match other-prefix paths', () => {
      expect(classifyRoute('/api/foo')).toBe('dynamic');
      expect(classifyRoute('/static/foo')).toBe('dynamic');
    });
  });

  it('exports patterns array', () => {
    expect(Array.isArray(__testing__.STATIC_PATTERNS)).toBe(true);
    expect(__testing__.STATIC_PATTERNS.length).toBeGreaterThan(0);
  });
});
