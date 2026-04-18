// ═══════════════════════════════════════════════════════════════
// PWA — Progressive Web App manifest configuration
// Used for: manifest.json generation, mobile home screen,
// splash screens, app install prompts.
// Pattern: Google PWA checklist, Lighthouse PWA audit requirements.
// ═══════════════════════════════════════════════════════════════

import { BRAND } from './brand.js';
import { COLORS } from './colors.js';

export const PWA = {
  /** App name on home screen */
  name: BRAND.name,

  /** Short name (under 12 chars) — shown below icon on home screen */
  shortName: BRAND.name,

  /** Description for app stores / install prompt */
  description: BRAND.description,

  /** Start URL when launched from home screen */
  startUrl: '/',

  /** Display mode */
  display: 'standalone' as const,

  /** Orientation */
  orientation: 'portrait' as const,

  /** Theme color — browser chrome color on mobile */
  themeColor: COLORS.primary,

  /** Background color — splash screen background */
  backgroundColor: COLORS.bgDark,

  /** Icon sizes needed for all platforms */
  iconSizes: [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512] as const,

  /** Favicon config — which sizes for which platform */
  favicons: {
    /** Standard browser favicon */
    ico: [16, 32],
    /** Apple touch icon */
    apple: [180],
    /** Android Chrome */
    android: [192, 512],
    /** Windows tile */
    ms: [144],
    /** Safari pinned tab SVG */
    safariPinned: true,
  },

  /** App categories for store listings */
  categories: ['health', 'medical', 'lifestyle'],

  /** Screenshots for install prompt (dimensions in px) */
  screenshotSizes: {
    mobile: { width: 375, height: 812 },
    desktop: { width: 1280, height: 720 },
  },
} as const;
