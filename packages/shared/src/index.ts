// ═══════════════════════════════════════════════════════════════
// @repo/shared — Barrel export
// Single source of truth for Datun's entire design system.
//
// Usage:
//   import { BRAND, COLORS, FONTS, SHADOWS, SEO } from '@repo/shared'
// ═══════════════════════════════════════════════════════════════

// ── Brand & Identity ──
export { BRAND } from './brand.js';
export {
  API_VERSION,
  SYSTEM_PROMPT_VERSION,
  PHOTO_PROMPT_VERSION,
  WORKFLOW_VERSION,
} from './version.js';
export { CONTACTS } from './contacts.js';
export { URLS } from './urls.js';

// ── Design Tokens ──
export { COLORS } from './colors.js';
export { FONTS } from './typography.js';
export { SPACING } from './spacing.js';
export { SHADOWS } from './shadows.js';
export { RADII } from './radii.js';
export { MOTION } from './motion.js';
export { BREAKPOINTS, MEDIA } from './breakpoints.js';
export { Z_INDEX } from './zindex.js';
export { THEME } from './theme.js';
export type { ThemeMode, ThemeTokens } from './theme.js';

// ── Component Tokens ──
export { COMPONENTS } from './components.js';

// ── Platform Config ──
export { SEO } from './seo.js';
export { PWA } from './pwa.js';

// ── Email Helpers ──
export { emailWrapper, emailFooter } from './emails.js';
