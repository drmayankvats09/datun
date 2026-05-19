// packages/shared/src/index.ts
// ═══════════════════════════════════════════════════════════════
// @repo/shared — Barrel export
//
// PHASE 1 (Task #47) UPDATE — ADDITIVE ONLY:
//   Added 4 new export lines at the bottom for Phase 1 DTOs:
//     ./types/consultation, ./types/clinic,
//     ./types/appointment, ./types/notification
//
//   No existing exports removed or renamed. Zero risk to running app.
//
// TASK #49 UPDATE — ADDITIVE ONLY:
//   Added 1 new section at the bottom for feature-flag types,
//   key registry and context factories. No existing exports
//   removed or renamed. Zero risk to running app.
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

// ── Queues (Task #41 BullMQ) ──
export * from './queues';

// ── Email Helpers ──
export { emailWrapper, emailFooter } from './emails';

// ── Validators (Task #38) ──
export * from './validators/index';

// ── Trace / observability ──
export * from './trace';

// ── Task #44: Training pipeline types ──
export * from './types/training';
export * from './types/judge';

// ── Task #46: Media pipeline types + constants ──
export * from './types/media';
export * from './constants/media.constants';

// ── Task #47: Frontend DTOs (TanStack Query layer) ──
export * from './types/consultation';
export * from './types/clinic';
export * from './types/appointment';
export * from './types/notification';

// ── Task #49: Feature flag platform ──
// Key registry, evaluation context schema, DTOs and shared enums.
// Imported by both `apps/api` and `apps/web` — single source of truth.
export * from './flags/index';
