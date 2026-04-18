// ═══════════════════════════════════════════════════════════════
// SHADOWS — Elevation system for depth perception
// 5-level elevation: flat → raised → floating → overlay → modal
// Pattern: Material Design elevation, Linear's shadow system.
// Used in: component styles, email card backgrounds, PDF boxes.
// ═══════════════════════════════════════════════════════════════

export const SHADOWS = {
  /** No shadow — flat on surface */
  none: 'none',

  /** Subtle lift — cards, list items on hover */
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',

  /** Default card shadow — resting state */
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',

  /** Raised — dropdown menus, popovers */
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',

  /** Floating — modals, dialogs */
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',

  /** Highest elevation — notifications, command palette */
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',

  /** Button press — inset shadow */
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

  /** Primary color glow — CTA buttons on hover */
  primaryGlow: '0 0 20px rgba(18, 196, 178, 0.3)',

  /** Focus ring — accessibility */
  focusRing: '0 0 0 3px rgba(18, 196, 178, 0.4)',
} as const;
