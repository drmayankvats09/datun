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
//
// TASK #50 UPDATE — ADDITIVE ONLY:
//   Extended the design-tokens `./motion` re-export to expose the
//   new Framer-Motion-friendly tokens (DURATION / EASE / SPRING /
//   DISTANCE / STAGGER) and their public types. The legacy `MOTION`
//   export is preserved unchanged.
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
// Task #21 (legacy CSS-side) + Task #50 (new Framer-side) — same file.
export { MOTION, DURATION, EASE, SPRING, DISTANCE, STAGGER } from './motion';
export type {
  DurationKey,
  EaseKey,
  SpringKey,
  DistanceKey,
  StaggerKey,
  CubicBezier,
  SpringConfig,
} from './motion';
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

// ── Validators (Task #38 → split in Task #53.5 W2, CUT-2) ──
// RUNTIME zod schemas moved to the `@repo/shared/validators`
// subpath. The root barrel is imported by ~129 files — including
// 30+ CLIENT components that only want design tokens / DTO types —
// and the old `export * from './validators/index'` shipped the
// entire zod runtime (58.88KB stat) inside the shared client chunk
// of EVERY page, even though zero client files use zod directly.
//
// What the root barrel still provides (verified consumer census):
//   1. `export type *` — every validator-derived TYPE (ApiResponse,
//      ConsultationStatus, Locale, Gender, …150 names) keeps
//      resolving from the root with ZERO import churn. Types erase
//      at compile time → zero bytes shipped.
//   2. ERROR_CODES — the ONE validator-tree export client code uses
//      at RUNTIME (lib/api/api-error.ts, lib/api/auth-fetch.ts,
//      lib/errors/categorize.ts, lib/query/query-client.ts + tests).
//      It lives in responses/error-codes.ts — a pure-constant module
//      with zero imports — so re-exporting it as a value costs the
//      constant's bytes only, never zod.
//
// Server code imports runtime schemas from the subpath:
//   import { signupEmailSchema } from '@repo/shared/validators';
//
// Guarantee (TS-verified): a VALUE import of any schema from the
// root now fails type-check with TS1362 ("cannot be used as a value
// because it was exported using 'export type'") — zod structurally
// cannot re-leak through this barrel, independent of bundler config.
// `sideEffects: false` in package.json is the second, independent
// layer of the same defence (it also shakes flags/flag-context's
// zod out of client builds, since clients import flag TYPES only).
export { ERROR_CODES } from './validators/responses/error-codes';
export type { ErrorCode } from './validators/responses/error-codes';
export type * from './validators/index';

// ── Trace / observability ──
// Stays in the root barrel intentionally: Task #53.5 W2 rewrote
// trace.ts onto Web Crypto, so it is now isomorphic and polyfill-free
// (the old node:crypto import was dragging crypto-browserify, 98.96KB
// stat, into the client bundle through this very barrel).
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
