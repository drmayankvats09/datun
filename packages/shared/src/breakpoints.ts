// ═══════════════════════════════════════════════════════════════
// BREAKPOINTS — Responsive design breakpoints
// Mobile-first approach: base styles = mobile, then scale up.
// Pattern: Tailwind's breakpoint system (aligned 1:1).
// Used in: JS-side media queries, email responsive tables,
// PDF layout decisions, server-side rendering hints.
// ═══════════════════════════════════════════════════════════════

export const BREAKPOINTS = {
  /** Small phone — 320px (iPhone SE, older Androids) */
  xs: 375,

  /** Standard phone — 640px (Tailwind sm) */
  sm: 640,

  /** Large phone / small tablet — 768px (Tailwind md) */
  md: 768,

  /** Tablet / small laptop — 1024px (Tailwind lg) */
  lg: 1024,

  /** Desktop — 1280px (Tailwind xl) */
  xl: 1280,

  /** Large desktop — 1536px (Tailwind 2xl) */
  '2xl': 1536,
} as const;

/** Media query helpers (for JS-side responsive logic) */
export const MEDIA = {
  mobile: `(max-width: ${BREAKPOINTS.sm - 1}px)`,
  tablet: `(min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,
  touch: '(hover: none) and (pointer: coarse)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  darkMode: '(prefers-color-scheme: dark)',
} as const;
