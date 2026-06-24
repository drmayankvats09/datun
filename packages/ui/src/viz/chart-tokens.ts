/**
 * Datun chart tokens + shared Recharts config — Part 19.2/19.5/19.6.
 * Every wrapper reads these so all charts are token-styled, CVD-safe, chartjunk-free.
 */
export const CHART_PALETTE = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
] as const;

export const CHART_TOKENS = {
  grid: 'var(--color-chart-grid)',
  axis: 'var(--color-chart-axis)',
  surface: 'var(--color-surface)',
  text: 'var(--color-text-primary)',
  muted: 'var(--color-text-muted)',
  tooltipShadow: 'var(--shadow-lg)', // L3 (Part 7)
  radius: 'var(--radius-md, 12px)',
  font: 'var(--font-sans)',
} as const;

/** CVD-safe non-colour markers (19.10c) — paired with each series by index. */
export const SERIES_MARKERS = ['circle', 'square', 'triangle', 'diamond', 'cross', 'star'] as const;
/** Line dash styles as a second non-colour cue. */
export const SERIES_DASH = ['0', '6 4', '2 4', '8 3 2 3'] as const;

/** en-IN axis abbreviation: 1200→1.2k · 250000→2.5L · 12000000→₹1.2Cr (full precision in tooltip). */
export function abbrINR(n: number, withRupee = true): string {
  const p = withRupee ? '₹' : '';
  if (Math.abs(n) >= 1e7) return `${p}${(n / 1e7).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (Math.abs(n) >= 1e5) return `${p}${(n / 1e5).toFixed(1).replace(/\.0$/, '')}L`;
  if (Math.abs(n) >= 1e3) return `${p}${(n / 1e3).toFixed(1).replace(/\.0$/, '')}k`;
  return `${p}${n}`;
}

export type ChartState = 'ready' | 'loading' | 'empty' | 'error' | 'insufficient';
