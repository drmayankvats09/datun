// ═══════════════════════════════════════════════════════════════
// TYPOGRAPHY — Font families, sizes, weights, line heights
// Inter = primary (medical-standard, Google/Stripe level)
// Mono = code blocks, clinical data, terminal output
// Pattern: Vercel's Geist, Linear's design system — type scale based on 4px grid.
// ═══════════════════════════════════════════════════════════════

export const FONTS = {
  /** Primary font — used everywhere */
  family: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },

  /** Font size scale (rem) — 4px grid aligned */
  size: {
    xs: '0.75rem', // 12px — captions, fine print
    sm: '0.875rem', // 14px — secondary text, labels
    base: '1rem', // 16px — body text
    lg: '1.125rem', // 18px — large body, subheadings
    xl: '1.25rem', // 20px — section headings
    '2xl': '1.5rem', // 24px — page headings
    '3xl': '1.875rem', // 30px — hero subheading
    '4xl': '2.25rem', // 36px — hero heading
    '5xl': '3rem', // 48px — display heading
  },

  /** Font weights */
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  /** Line heights — tighter for headings, relaxed for body */
  lineHeight: {
    tight: '1.2', // headings
    snug: '1.375', // subheadings
    normal: '1.5', // body text — optimal readability
    relaxed: '1.625', // long-form content
    loose: '2', // spacious layouts
  },

  /** Letter spacing */
  tracking: {
    tighter: '-0.02em', // large display headings
    tight: '-0.01em', // headings
    normal: '0', // body
    wide: '0.025em', // uppercase labels, buttons
  },
} as const;
