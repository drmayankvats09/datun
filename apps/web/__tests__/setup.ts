// apps/web/__tests__/setup.ts
// ═══════════════════════════════════════════════════════════════
// FRONTEND TEST SETUP — FAANG-grade browser API mocks for jsdom
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { vi, afterEach, type Mock } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ── Cleanup after each test ──
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// ── Mock: next-intl ──
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
  useFormatter: () => ({
    dateTime: (d: Date) => d.toISOString(),
    number: (n: number) => String(n),
    relativeTime: (v: number) => `${v}`,
  }),
}));

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

// ── Mock: next/headers (Task #45 — CSP nonce in server components) ──
// getNonce() in apps/web/lib/csp/get-nonce.ts reads `x-nonce` via the
// `headers()` helper from next/headers. Tests that exercise pages or
// layouts must see a deterministic nonce value. Returning a fixed string
// here lets snapshot tests stay stable.
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

// ── Mock: @sentry/nextjs ──
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
  withSentryConfig: (config: unknown) => config,
}));

// ── Mock: BroadcastChannel ──
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  constructor(name: string) {
    this.name = name;
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

Object.defineProperty(globalThis, 'BroadcastChannel', {
  value: MockBroadcastChannel,
  writable: true,
});

// ── Mock: window.matchMedia ──
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ── Mock: window.visualViewport ──
const mockVisualViewport: Record<string, unknown> = {
  width: 375,
  height: 667,
  offsetLeft: 0,
  offsetTop: 0,
  pageLeft: 0,
  pageTop: 0,
  scale: 1,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

Object.defineProperty(window, 'visualViewport', {
  value: mockVisualViewport,
  writable: true,
  configurable: true,
});

// ── Mock: IntersectionObserver ──
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  value: MockIntersectionObserver,
  writable: true,
});

// ── Mock: ResizeObserver ──
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: MockResizeObserver,
  writable: true,
});

// ── Export mocks for test assertions ──
export { mockPush, mockReplace, mockBack, mockSetTheme, mockVisualViewport };
