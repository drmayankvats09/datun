// ═══════════════════════════════════════════════════════════════
// @repo/shared — Barrel export
// ═══════════════════════════════════════════════════════════════

// ── Brand & Identity ──
export { BRAND } from './brand';
export {
  API_VERSION,
  SYSTEM_PROMPT_VERSION,
  PHOTO_PROMPT_VERSION,
  WORKFLOW_VERSION,
} from './version';
export { CONTACTS } from './contacts';
export { URLS } from './urls';

// ── Design Tokens ──
export { COLORS } from './colors';
export { FONTS } from './typography';
export { SPACING } from './spacing';
export { SHADOWS } from './shadows';
export { RADII } from './radii';
export { MOTION } from './motion';
export { BREAKPOINTS, MEDIA } from './breakpoints';
export { Z_INDEX } from './zindex';
export { THEME } from './theme';
export type { ThemeMode, ThemeTokens } from './theme';

// ── Component Tokens ──
export { COMPONENTS } from './components';

// ── Platform Config ──
export { SEO } from './seo';
export { PWA } from './pwa';

export * from './queues';

// ── Email Helpers ──
export { emailWrapper, emailFooter } from './emails';

// ── Validators (Task #38) ──
export * from './validators/index';

export * from './trace';

// ── Task #44: Training pipeline types ──
export * from './types/training';
export * from './types/judge';
