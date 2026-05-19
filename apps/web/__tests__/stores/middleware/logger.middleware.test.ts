// ═══════════════════════════════════════════════════════════════
// LOGGER MIDDLEWARE TESTS — Action logging + Sentry breadcrumbs
//
// The logger middleware sits at the outermost layer of every store and
// emits action breadcrumbs to:
//   - Console (dev, gated by devtoolsEnabled)
//   - Sentry.addBreadcrumb (prod, gated by sentryEnabled)
//
// CRITICAL: the PII filter (extractSafeSnapshot) must NEVER leak:
//   - User objects (name, email, phone)
//   - Long strings (likely user content)
//   - Nested objects
// And MUST capture:
//   - Booleans (isLoading, hasUnsavedChanges)
//   - Numbers (counters, timestamps)
//   - Short strings (status codes, language codes)
//   - Array lengths (just the count)
//
// We test by spying on Sentry.addBreadcrumb + verifying its `data` arg.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { logger } from '../../../stores/middleware/logger.middleware';

// ─── Sentry mock — captures addBreadcrumb calls ──────────────

const breadcrumbs: Array<{
  category: string;
  message: string;
  data: Record<string, unknown> | undefined;
}> = [];

vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: vi.fn(
    (b: { category: string; message: string; data: Record<string, unknown> | undefined }) => {
      breadcrumbs.push({
        category: b.category,
        message: b.message,
        data: b.data,
      });
    },
  ),
}));

beforeEach(() => {
  breadcrumbs.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Helpers — build a test store wrapped with logger ────────

interface TestState {
  count: number;
  active: boolean;
  status: 'idle' | 'busy';
  user: { id: string; email: string } | null;
  longString: string;
  messages: number[];
  __internal: boolean;
  increment: () => void;
  setActive: (v: boolean) => void;
  setUser: (u: { id: string; email: string }) => void;
}

function makeStore(opts: { name: string; sentryEnabled?: boolean }) {
  return create<TestState>()(
    logger(
      devtools(
        (set) => ({
          count: 0,
          active: false,
          status: 'idle' as const,
          user: null,
          longString: '',
          messages: [],
          __internal: false,
          increment: () => set((s) => ({ count: s.count + 1 }), false, 'test/increment'),
          setActive: (active) => set({ active }, false, 'test/setActive'),
          setUser: (user) => set({ user }, false, 'test/setUser'),
        }),
        // devtools options — `enabled: false` keeps it as a no-op at runtime
        // (no Redux DevTools connection in jsdom) but the TypeScript mutator
        // is still applied, which is what enables the 3-arg `set(...)` form
        // used by all test store actions above.
        { enabled: false },
      ),
      {
        name: opts.name,
        consoleEnabled: false, // never log to console in tests
        sentryEnabled: opts.sentryEnabled ?? true,
      },
    ),
  );
}

// ─── Action label extraction ─────────────────────────────────

describe('Logger — action label extraction', () => {
  it('captures the action label from set(state, replace, action)', () => {
    const store = makeStore({ name: 'Test' });
    store.getState().increment();
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0]!.message).toBe('test/increment');
    expect(breadcrumbs[0]!.category).toBe('store.test');
  });

  it('renders <anonymous> when no action label is provided', () => {
    const store = makeStore({ name: 'Test' });
    // Direct setState without action label
    store.setState({ count: 99 });
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0]!.message).toBe('<anonymous>');
  });
});

// ─── PII filter (extractSafeSnapshot) ────────────────────────

describe('Logger — PII filter (extractSafeSnapshot)', () => {
  it('captures booleans and numbers', () => {
    const store = makeStore({ name: 'Test' });
    store.getState().setActive(true);
    store.getState().increment();
    const lastData = breadcrumbs[breadcrumbs.length - 1]!.data;
    expect(lastData?.active).toBe(true);
    expect(lastData?.count).toBe(1);
  });

  it('captures short strings (≤ 32 chars)', () => {
    const store = makeStore({ name: 'Test' });
    store.setState({ status: 'busy' }, false, 'test/setStatus');
    const data = breadcrumbs[breadcrumbs.length - 1]!.data;
    expect(data?.status).toBe('busy');
  });

  it('DROPS long strings (> 32 chars — likely user content)', () => {
    const store = makeStore({ name: 'Test' });
    const longText = 'x'.repeat(200);
    store.setState({ longString: longText }, false, 'test/setLongString');
    const data = breadcrumbs[breadcrumbs.length - 1]!.data;
    expect(data?.longString).toBeUndefined();
  });

  it('DROPS user objects entirely (no PII leak)', () => {
    const store = makeStore({ name: 'Test' });
    store.getState().setUser({ id: 'u1', email: 'leak@example.com' });
    const data = breadcrumbs[breadcrumbs.length - 1]!.data;
    expect(data?.user).toBeUndefined();
    // None of the user's PII should appear ANYWHERE in the breadcrumb
    const stringified = JSON.stringify(data);
    expect(stringified).not.toContain('leak@example.com');
    expect(stringified).not.toContain('u1');
  });

  it('captures array LENGTH (not contents) under <key>_count', () => {
    const store = makeStore({ name: 'Test' });
    store.setState({ messages: [1, 2, 3, 4, 5] }, false, 'test/setMessages');
    const data = breadcrumbs[breadcrumbs.length - 1]!.data;
    expect(data?.messages_count).toBe(5);
    expect(data?.messages).toBeUndefined();
  });

  it('SKIPS keys starting with __ (hydration internals)', () => {
    const store = makeStore({ name: 'Test' });
    store.setState({ __internal: true }, false, 'test/setInternal');
    const data = breadcrumbs[breadcrumbs.length - 1]!.data;
    expect(data?.__internal).toBeUndefined();
  });
});

// ─── Sentry enabled/disabled gating ──────────────────────────

describe('Logger — Sentry gating', () => {
  it('skips Sentry breadcrumbs when sentryEnabled is false', () => {
    const store = makeStore({ name: 'Test', sentryEnabled: false });
    store.getState().increment();
    expect(breadcrumbs).toHaveLength(0);
  });
});

// ─── External setState routing ───────────────────────────────

describe('Logger — external setState routing', () => {
  it('logs actions even when triggered via store.setState() from outside', () => {
    const store = makeStore({ name: 'Test' });
    // External callers (e.g., resetAllStores) call setState directly.
    // The logger replaces store.setState so it still captures the action.
    store.setState({ count: 42 }, false, 'external/reset');
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0]!.message).toBe('external/reset');
  });
});
