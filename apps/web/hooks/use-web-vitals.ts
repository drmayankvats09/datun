// ═══════════════════════════════════════════════════════════════
// USE-WEB-VITALS — Core Web Vitals → Sentry Performance
// Google ranking factors: LCP < 2.5s, CLS < 0.1, INP < 200ms.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useReportWebVitals } from 'next/web-vitals';
import * as Sentry from '@sentry/nextjs';

/**
 * Reports Core Web Vitals to Sentry Performance.
 * Place in AppProvider — runs once per page load.
 *
 * @example
 * ```tsx
 * useWebVitals(); // in AppProvider
 * ```
 */
export function useWebVitals(): void {
  useReportWebVitals((metric) => {
    const transaction = Sentry.getActiveSpan();
    if (transaction) {
      Sentry.setMeasurement(metric.name, metric.value, 'millisecond');
    }

    // Log poor metrics for debugging
    const thresholds: Record<string, number> = {
      LCP: 2500,
      CLS: 0.1,
      INP: 200,
      FCP: 1800,
      TTFB: 800,
    };

    const threshold = thresholds[metric.name];
    if (threshold && metric.value > threshold) {
      console.warn(
        `[WebVitals] ${metric.name} = ${metric.value.toFixed(1)} (threshold: ${threshold})`,
      );
    }
  });
}
