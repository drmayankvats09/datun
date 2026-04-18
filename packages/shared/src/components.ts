// ═══════════════════════════════════════════════════════════════
// COMPONENT TOKENS — Shared design specs for common UI elements
// Used by: web (CSS/Tailwind), API (email HTML), PDF generation
// Pattern: Design system tokens that cross platform boundaries.
// ═══════════════════════════════════════════════════════════════

import { RADII } from './radii.js';
import { SHADOWS } from './shadows.js';

export const COMPONENTS = {
  /** Button variants */
  button: {
    /** Border radius for all buttons */
    radius: RADII.md,
    /** Minimum height for touch targets (accessibility: 44px minimum) */
    minHeight: '44px',
    /** Horizontal padding */
    paddingX: '16px',
    /** Font weight */
    fontWeight: '600',
    /** Letter spacing */
    letterSpacing: '0.025em',
    /** Hover shadow for primary buttons */
    hoverShadow: SHADOWS.primaryGlow,
    /** Active/pressed scale */
    activeScale: '0.98',
  },

  /** Input fields */
  input: {
    radius: RADII.md,
    minHeight: '44px',
    paddingX: '12px',
    paddingY: '10px',
    focusShadow: SHADOWS.focusRing,
  },

  /** Cards */
  card: {
    radius: RADII.lg,
    padding: '24px',
    shadow: SHADOWS.sm,
    hoverShadow: SHADOWS.md,
  },

  /** Modal/Dialog */
  modal: {
    radius: RADII.xl,
    padding: '24px',
    shadow: SHADOWS.lg,
    backdropOpacity: '0.5',
    maxWidth: '500px',
  },

  /** Toast/Notification */
  toast: {
    radius: RADII.lg,
    padding: '16px',
    shadow: SHADOWS.lg,
    maxWidth: '400px',
  },

  /** Avatar */
  avatar: {
    radius: RADII.circle,
    sizes: {
      sm: '32px',
      md: '40px',
      lg: '48px',
      xl: '64px',
    },
  },

  /** Badge/Tag */
  badge: {
    radius: RADII.full,
    paddingX: '8px',
    paddingY: '2px',
    fontSize: '12px',
    fontWeight: '500',
  },

  /** Consultation chat bubble */
  chatBubble: {
    radius: RADII.lg,
    padding: '12px 16px',
    maxWidth: '85%',
    /** AI message has different radius (no top-left round) */
    aiRadiusTopLeft: RADII.sm,
    /** User message has different radius (no top-right round) */
    userRadiusTopRight: RADII.sm,
  },

  /** Assessment/RX card */
  assessmentCard: {
    radius: RADII.xl,
    padding: '24px',
    shadow: SHADOWS.md,
  },
} as const;
