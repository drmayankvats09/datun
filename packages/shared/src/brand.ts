// ═══════════════════════════════════════════════════════════════
// BRAND — Single source of truth for all Datun branding
// Change here → propagates to API, web, emails, PDF, WhatsApp.
// Pattern: Stripe, Linear, Cal.com — all centralize brand config.
// ═══════════════════════════════════════════════════════════════

export const BRAND = {
  /** Display name used everywhere */
  name: 'Datun',

  /** Full legal entity name — company registration, invoices, T&C */
  legalName: 'Datun Health Private Limited',

  /** One-liner shown in footers, emails, WhatsApp signatures */
  tagline: 'Everyone Deserves a Doctor.',

  /** Short description for SEO, meta tags, social cards */
  description:
    'AI-powered healthcare platform for India, beginning with dental care and expanding across medical verticals.',

  /** AI identity name used in clinical prompts (separate from brand for flexibility) */
  aiName: 'Datun',

  /** Copyright line */
  copyright: (year?: number) => `© ${year ?? new Date().getFullYear()} ${BRAND.legalName}`,
} as const;
