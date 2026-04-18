// ═══════════════════════════════════════════════════════════════
// MOTION — Animation durations, easing curves, transitions
// Pattern: Material Design motion, Framer Motion best practices.
// Rule: Fast enough to feel responsive, slow enough to be perceived.
// prefers-reduced-motion MUST be respected at consumption site.
// ═══════════════════════════════════════════════════════════════

export const MOTION = {
  /** Duration scale (ms) */
  duration: {
    /** Instant — button state, checkbox toggle */
    instant: 100,
    /** Fast — tooltips, small reveals */
    fast: 150,
    /** Normal — most transitions (hover, focus, collapse) */
    normal: 200,
    /** Moderate — page transitions, modals */
    moderate: 300,
    /** Slow — complex choreography, skeleton fade-in */
    slow: 500,
  },

  /** CSS duration strings */
  css: {
    instant: '100ms',
    fast: '150ms',
    normal: '200ms',
    moderate: '300ms',
    slow: '500ms',
  },

  /** Easing curves */
  easing: {
    /** Default — most transitions */
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** Enter screen — elements appearing */
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    /** Leave screen — elements disappearing */
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    /** Bounce — playful interactions (sparingly) */
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  /** Common transition presets (CSS transition shorthand) */
  transition: {
    /** Default — background, color, border, opacity */
    default: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    /** Colors only — hover states */
    colors: 'color 150ms ease, background-color 150ms ease, border-color 150ms ease',
    /** Transform — scale, translate */
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    /** Opacity — fade in/out */
    opacity: 'opacity 200ms ease',
  },
} as const;
