// ═══════════════════════════════════════════════════════════════
// BORDER RADIUS — Consistent roundness across all surfaces
// Pattern: Tailwind's radius scale. Slightly rounded = premium,
// fully rounded = playful. We aim for medical-premium.
// ═══════════════════════════════════════════════════════════════

export const RADII = {
  /** No rounding — tables, technical UI */
  none: '0',

  /** Subtle — input fields, inline code */
  sm: '0.25rem', // 4px

  /** Default — buttons, cards, badges */
  md: '0.5rem', // 8px

  /** Prominent — modals, large cards, containers */
  lg: '0.75rem', // 12px

  /** Extra — feature cards, hero sections */
  xl: '1rem', // 16px

  /** Pill — tags, chips, small badges */
  full: '9999px',

  /** Circle — avatars, icon buttons */
  circle: '50%',
} as const;
