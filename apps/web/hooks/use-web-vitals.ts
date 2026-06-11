// apps/web/hooks/use-web-vitals.ts
// ═══════════════════════════════════════════════════════════════
// USE-WEB-VITALS — Core Web Vitals → Sentry Performance
// (UPGRADED — Task #53: rating buckets + correct units + span attrs)
//
// WHAT THIS HOOK IS:
//   The Sentry half of Datun's field-performance pipeline. For every
//   page load it forwards the browser's Core Web Vitals into the
//   active Sentry trace, so a slow consultation can be debugged as
//   "THIS session had LCP 4.1s on /consult" — per-user, per-trace.
//
// HOW IT FITS THE TASK #53 SYSTEM (three layers, no overlap):
//   • Lighthouse CI (lab)            → blocks regressions pre-merge.
//   • Speed Insights (field, fleet)  → p75 trends per route
//                                      (components/providers/speed-insights.tsx).
//   • THIS hook (field, per-session) → vitals attached to Sentry
//                                      traces for incident debugging.
//
// 2026 METRIC NOTES:
//   • INP replaced FID as the responsiveness Core Web Vital
//     (March 2024). This hook already tracks INP — no FID anywhere.
//   • Ratings below use the official web-vitals "good"/"poor"
//     boundaries; Google judges the p75 of field data against the
//     same numbers. Keeping identical buckets means a Sentry query
//     and a CrUX report speak the same language.
//   • We deliberately do NOT import the `web-vitals/attribution`
//     build (which names the exact slow element/script): it costs
//     several extra KB against the very script budgets Task #53
//     enforces. Next's built-in reporter + Sentry trace context is
//     the right cost/benefit for Datun today. Revisit only if a
//     vital regresses in the field and the trace alone can't explain
//     it (note in ADR-0009 before flipping).
//
// TASK #53 UPGRADES vs the Task #36-era version:
//   1. RATING — every metric is bucketed good / needs-improvement /
//      poor. The browser payload usually carries `rating` already;
//      a local fallback derives it so Next-custom metrics and older
//      payloads never crash the pipeline.
//   2. CORRECT UNITS — CLS is a unitless score, not milliseconds.
//      The old version stamped everything 'millisecond', which made
//      Sentry render "0.05 ms" for CLS. Fixed via METRIC_UNITS.
//   3. SPAN ATTRIBUTES — value + rating are attached as attributes
//      on the active span (`web_vital.lcp`, `web_vital.lcp.rating`),
//      making traces filterable in Sentry by vital quality.
//   4. DEV-ONLY CONSOLE — threshold warnings now print only outside
//      production (FAANG hygiene: zero console noise for end users;
//      production signal lives in Sentry + Speed Insights).
//
// CONSUMER CONTRACT (verified — do not break):
//   • Exported as `useWebVitals(): void` — called once in
//     components/providers/app-provider.tsx and re-exported by
//     hooks/index.ts. Signature unchanged in this upgrade.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useReportWebVitals } from 'next/web-vitals';
import * as Sentry from '@sentry/nextjs';

/** Google's three field-data quality buckets. */
type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Official web-vitals boundaries: [good ≤ x, poor > y].
 * value ≤ good → 'good'; value > poor → 'poor'; else 'needs-improvement'.
 * Source: the web-vitals library thresholds Google uses for CrUX.
 */
const RATING_THRESHOLDS: Record<string, readonly [good: number, poor: number]> = {
  LCP: [2500, 4000], // ms — Largest Contentful Paint
  INP: [200, 500], // ms — Interaction to Next Paint (FID's 2024 successor)
  CLS: [0.1, 0.25], // unitless — Cumulative Layout Shift
  FCP: [1800, 3000], // ms — First Contentful Paint
  TTFB: [800, 1800], // ms — Time To First Byte
};

/**
 * Sentry measurement units per metric. Everything is milliseconds
 * except CLS, which is a unitless layout-shift score ('' = none).
 */
const METRIC_UNITS: Record<string, 'millisecond' | ''> = {
  LCP: 'millisecond',
  INP: 'millisecond',
  FCP: 'millisecond',
  TTFB: 'millisecond',
  CLS: '',
};

/**
 * Derives a rating when the metric payload doesn't include one
 * (Next.js custom metrics like `Next.js-hydration`, defensive paths).
 *
 * @param name - Metric name as reported (e.g. 'LCP').
 * @param value - Raw metric value in its native unit.
 * @returns The Google bucket, or null for metrics we don't classify.
 */
function deriveRating(name: string, value: number): WebVitalRating | null {
  const thresholds = RATING_THRESHOLDS[name];
  if (!thresholds) return null;

  const [good, poor] = thresholds;
  if (value <= good) return 'good';
  if (value > poor) return 'poor';
  return 'needs-improvement';
}

/**
 * Reports Core Web Vitals to Sentry Performance with Google-aligned
 * quality ratings.
 *
 * Mount ONCE per page tree — Datun calls it in AppProvider, which the
 * locale layout renders for every route.
 *
 * @example
 * ```tsx
 * // components/providers/app-provider.tsx
 * useWebVitals();
 * ```
 */
export function useWebVitals(): void {
  useReportWebVitals((metric) => {
    const { name, value } = metric;

    // Next's reporter forwards the web-vitals `rating` for the core
    // metrics; the cast + fallback keeps us safe for the Next.js
    // custom metrics that ship without one.
    const rating = (metric as { rating?: WebVitalRating }).rating ?? deriveRating(name, value);

    // ── 1. Attach to the active trace ──────────────────────────
    const activeSpan = Sentry.getActiveSpan();
    if (activeSpan) {
      const attributeKey = `web_vital.${name.toLowerCase()}`;
      activeSpan.setAttributes(
        rating
          ? { [attributeKey]: value, [`${attributeKey}.rating`]: rating }
          : { [attributeKey]: value },
      );
    }

    // Top-level measurement — powers Sentry's Web Vitals UI/queries.
    Sentry.setMeasurement(name, value, METRIC_UNITS[name] ?? 'millisecond');

    // ── 2. Dev-only console signal ──────────────────────────────
    // Production stays silent (signal lives in Sentry + Speed
    // Insights); during local work a non-'good' vital prints with
    // its bucket so regressions are visible the moment they happen.
    if (process.env.NODE_ENV !== 'production' && rating && rating !== 'good') {
      const [goodThreshold] = RATING_THRESHOLDS[name] ?? [];
      console.warn(
        `[WebVitals] ${name} = ${value.toFixed(name === 'CLS' ? 3 : 1)} ` +
          `(${rating}${goodThreshold !== undefined ? `, good ≤ ${goodThreshold}` : ''})`,
      );
    }
  });
}
