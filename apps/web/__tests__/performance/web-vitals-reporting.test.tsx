// apps/web/__tests__/performance/web-vitals-reporting.test.tsx
// ═══════════════════════════════════════════════════════════════
// FIELD-RUM WATCHMEN — Task #53
//
// Guards the runtime half of the performance system:
//   • hooks/use-web-vitals.ts  — the Sentry reporting pipeline
//   • components/providers/speed-insights.tsx — the RUM mount
//
// The single most important test here is the CLS UNIT REGRESSION:
// the pre-#53 hook stamped every metric 'millisecond', so Sentry
// rendered CLS as "0.05 ms". That bug was fixed in #53 — this file
// makes sure it can never quietly return.
//
// Mock strategy:
//   • `next/web-vitals` — useReportWebVitals is replaced with a stub
//     that CAPTURES the callback, letting tests fire synthetic
//     metrics exactly as the browser would.
//   • `@sentry/nextjs` — getActiveSpan / setMeasurement become spies
//     so every outbound side effect is observable.
//   • `@vercel/speed-insights/next` — replaced with a marked stub so
//     the provider test asserts mounting without loading any script.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';

// ── Captured callback from the mocked Next reporter ─────────────
type MetricLike = {
  id: string;
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
};
let capturedReporter: ((metric: MetricLike) => void) | undefined;

vi.mock('next/web-vitals', () => ({
  useReportWebVitals: (callback: (metric: MetricLike) => void) => {
    capturedReporter = callback;
  },
}));

// ── Sentry spies ─────────────────────────────────────────────────
const setAttributes = vi.fn();
const setMeasurement = vi.fn();
let activeSpan: { setAttributes: typeof setAttributes } | undefined = {
  setAttributes,
};

vi.mock('@sentry/nextjs', () => ({
  getActiveSpan: () => activeSpan,
  setMeasurement: (...args: unknown[]) => setMeasurement(...args),
}));

// ── Speed Insights stub ──────────────────────────────────────────
vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => <div data-testid="speed-insights-stub" />,
}));

import { useWebVitals } from '@/hooks/use-web-vitals';
import { SpeedInsightsClient } from '@/components/providers/speed-insights';

/** Mounts the hook and returns the captured browser-side reporter. */
function mountReporter(): (metric: MetricLike) => void {
  renderHook(() => useWebVitals());
  if (!capturedReporter) throw new Error('useReportWebVitals was not wired');
  return capturedReporter;
}

beforeEach(() => {
  capturedReporter = undefined;
  activeSpan = { setAttributes };
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useWebVitals — Sentry measurement units', () => {
  it('reports CLS as UNITLESS (regression guard for the "0.05 ms" bug)', () => {
    const report = mountReporter();
    report({ id: 'v1', name: 'CLS', value: 0.05, rating: 'good' });
    expect(setMeasurement).toHaveBeenCalledWith('CLS', 0.05, '');
  });

  it.each([
    ['LCP', 1200],
    ['INP', 180],
    ['FCP', 900],
    ['TTFB', 300],
  ])('reports %s in milliseconds', (name, value) => {
    const report = mountReporter();
    report({ id: 'v1', name, value, rating: 'good' });
    expect(setMeasurement).toHaveBeenCalledWith(name, value, 'millisecond');
  });
});

describe('useWebVitals — rating pipeline', () => {
  it('attaches browser-provided rating to the active span', () => {
    const report = mountReporter();
    report({ id: 'v1', name: 'LCP', value: 1400, rating: 'good' });
    expect(setAttributes).toHaveBeenCalledWith({
      'web_vital.lcp': 1400,
      'web_vital.lcp.rating': 'good',
    });
  });

  it('derives the rating when the payload omits it (LCP 3000 → needs-improvement)', () => {
    const report = mountReporter();
    report({ id: 'v1', name: 'LCP', value: 3000 });
    expect(setAttributes).toHaveBeenCalledWith({
      'web_vital.lcp': 3000,
      'web_vital.lcp.rating': 'needs-improvement',
    });
  });

  it('derives "poor" past the poor threshold (INP 600)', () => {
    const report = mountReporter();
    report({ id: 'v1', name: 'INP', value: 600 });
    expect(setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ 'web_vital.inp.rating': 'poor' }),
    );
  });

  it('omits the rating attribute for unclassified Next custom metrics', () => {
    const report = mountReporter();
    report({ id: 'v1', name: 'Next.js-hydration', value: 250 });
    expect(setAttributes).toHaveBeenCalledWith({
      'web_vital.next.js-hydration': 250,
    });
    // Still measured — just without a quality bucket.
    expect(setMeasurement).toHaveBeenCalledWith('Next.js-hydration', 250, 'millisecond');
  });

  it('survives the no-active-span path (early metrics before a span exists)', () => {
    activeSpan = undefined;
    const report = mountReporter();
    expect(() => report({ id: 'v1', name: 'TTFB', value: 200, rating: 'good' })).not.toThrow();
    expect(setMeasurement).toHaveBeenCalledWith('TTFB', 200, 'millisecond');
    expect(setAttributes).not.toHaveBeenCalled();
  });
});

describe('useWebVitals — console discipline (non-production env here)', () => {
  it('stays silent for "good" vitals', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const report = mountReporter();
    report({ id: 'v1', name: 'LCP', value: 1000, rating: 'good' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns with the bucket for non-good vitals', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const report = mountReporter();
    report({ id: 'v1', name: 'INP', value: 350, rating: 'needs-improvement' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('needs-improvement');
  });
});

describe('SpeedInsightsClient — RUM mount', () => {
  it('renders the Vercel collector exactly once', () => {
    render(<SpeedInsightsClient />);
    expect(screen.getAllByTestId('speed-insights-stub')).toHaveLength(1);
  });
});
