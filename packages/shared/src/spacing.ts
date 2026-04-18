// ═══════════════════════════════════════════════════════════════
// SPACING — 4px grid system for consistent layouts
// Used in email templates, PDF margins, component gaps.
// Pattern: Tailwind's spacing scale, Material Design's 4dp grid.
// ═══════════════════════════════════════════════════════════════

export const SPACING = {
  /** Base unit in px — everything is a multiple of this */
  unit: 4,

  /** Named spacing scale (px values for non-CSS contexts like emails/PDFs) */
  px: {
    0: 0,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
  },

  /** Content widths — used for email containers, page max-width */
  maxWidth: {
    /** Email template max width */
    email: '600px',
    /** PDF page content width */
    pdf: '540px',
    /** Mobile-first content area */
    content: '768px',
    /** Desktop content area */
    wide: '1024px',
    /** Full-width dashboard */
    full: '1280px',
  },
} as const;
