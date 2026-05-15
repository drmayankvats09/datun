// ═══════════════════════════════════════════════════════════════
// FRONTEND TEST SETUP — FAANG-grade browser API mocks for jsdom
//
// Task #46 changes:
//   - useTranslations: now returns a callable that namespaces keys
//     (matches the next-intl Translator API surface — supports
//     `t(key)` AND `t.has(key)`). Component code uses both forms.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { vi, afterEach, type Mock } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ── Polyfill: Blob URL API (jsdom doesn't implement these) ──
//
// Hooks that preview uploaded blobs call URL.createObjectURL(blob) and
// must revoke the URL on unmount to avoid memory leaks. jsdom omits
// these APIs entirely. We stub them with deterministic synchronous
// implementations so tests can verify create/revoke pairing.
if (typeof URL.createObjectURL === 'undefined') {
  let __objectUrlCounter = 0;
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    configurable: true,
    value: vi.fn(() => `blob:test://${++__objectUrlCounter}`),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
}

// ── Cleanup after each test ──
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// ── Mock: next-intl ──
//
// next-intl's `useTranslations(namespace)` returns a Translator that:
//   1. Is callable: `t(key)` → returns translated string
//   2. Has `.has(key)` method → returns true if key exists in messages
//   3. Has `.raw(key)` / `.rich(key)` (we don't use these in tests)
//
// Our mock mirrors this contract. The returned callable prepends the
// namespace so assertions like /media\.uploader\.stageUploading/i match
// what the user-facing component would render through real next-intl.
vi.mock('next-intl', () => {
  function makeTranslator(namespace?: string) {
    const prefix = namespace ? `${namespace}.` : '';
    const t = (key: string) => `${prefix}${key}`;
    // Translator is callable AND has methods — replicate that shape.
    return Object.assign(t, {
      has: (_key: string): boolean => Boolean(_key),
      // raw/rich kept simple — return the namespaced key for tests
      // that snapshot rendered output.
      raw: (key: string) => `${prefix}${key}`,
      rich: (key: string) => `${prefix}${key}`,
      markup: (key: string) => `${prefix}${key}`,
    });
  }
  return {
    useTranslations: (namespace?: string) => makeTranslator(namespace),
    useLocale: () => 'en',
    useFormatter: () => ({
      dateTime: (d: Date) => d.toISOString(),
      number: (n: number) => String(n),
      relativeTime: (v: number) => `${v}`,
    }),
  };
});

// ── Mock: next/navigation ──
const mockPush: Mock = vi.fn();
const mockReplace: Mock = vi.fn();
const mockBack: Mock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// ── Mock: @/i18n/navigation ──
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  usePathname: () => '/',
  Link: React.forwardRef(function MockLink(
    props: { href?: string; children?: React.ReactNode; [key: string]: unknown },
    ref: React.Ref<HTMLAnchorElement>,
  ) {
    return React.createElement(
      'a',
      { ...props, href: String(props.href ?? '/'), ref },
      props.children,
    );
  }),
}));

// ── Mock: next-themes ──
const mockSetTheme: Mock = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: mockSetTheme }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── Mock: next/headers ──
vi.mock('next/headers', () => ({
  headers: () =>
    Promise.resolve({
      get: (name: string) => (name === 'x-nonce' ? 'TEST_NONCE_FIXED_FOR_UNIT_TESTS' : null),
    }),
  cookies: () =>
    Promise.resolve({
      get: () => undefined,
      set: vi.fn(),
      delete: vi.fn(),
    }),
}));
