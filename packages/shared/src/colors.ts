// ═══════════════════════════════════════════════════════════════
// COLORS — Brand palette used in emails, PDFs, API responses
// Tailwind CSS vars are in apps/web — these are for non-CSS contexts
// (email HTML, PDFKit, WhatsApp template params, etc.)
// ═══════════════════════════════════════════════════════════════

export const COLORS = {
  /** Primary teal — brand accent, headers, CTAs */
  primary: '#12c4b2',

  /** Dark background — email templates, dark UI surfaces */
  bgDark: '#0a0f1a',

  /** Secondary dark — code blocks, pre tags in emails */
  bgDarkSecondary: '#111827',

  /** Success/info green — log highlights, success states */
  info: '#0a9e8f',

  /** Mint accent — data rows, subtle highlights */
  mint: '#a7f3d0',

  /** Alert severities — used in admin alert emails */
  alert: {
    critical: '#dc2626',
    warning: '#f59e0b',
    info: '#0a9e8f',
  },

  /** Muted text — footers, secondary info */
  muted: '#888888',

  /** Error/danger red — emergency highlights */
  danger: '#fca5a5',
} as const;
