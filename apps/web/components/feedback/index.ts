// ═══════════════════════════════════════════════════════════════
// FEEDBACK — Barrel exports for all "system feedback" surfaces:
// loading skeletons, empty states, errors, offline notices,
// progress indicators, and form-level loading buttons.
//
// Importing surfaces use a single line:
//
//   import {
//     EmptyState,
//     PageSkeleton,
//     type EmptyStateVariant,
//   } from '@/components/feedback';
//
// Anything that lives under `components/feedback/skeletons/` is
// surfaced through its own sub-barrel (see Phase 2) so that
// skeleton imports remain visually distinct from the general
// feedback exports — a small but important readability win.
//
// Task #51 — Loading skeletons + empty states everywhere.
// Refactor of the Task #50 feedback barrel.
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// Generic page-level skeletons (Task #50 — unchanged).
// Page-specific skeletons live in `./skeletons/` (Phase 2).
// ─────────────────────────────────────────────────────────────────
export { PageSkeleton, CardGridSkeleton, ChatSkeleton, FormSkeleton } from './page-skeleton';

// ─────────────────────────────────────────────────────────────────
// Empty state — component + registry (Task #51).
// ─────────────────────────────────────────────────────────────────
export { EmptyState, type EmptyStateProps } from './empty-state';
export {
  EMPTY_STATE_REGISTRY,
  ALL_EMPTY_STATE_VARIANTS,
  getEmptyStateDescriptor,
  isEmptyStateVariant,
  type EmptyStateVariant,
  type EmptyStateDescriptor,
  type EmptyStateTone,
} from './empty-state-registry';

// ─────────────────────────────────────────────────────────────────
// Error / offline / progress surfaces (Task #50 — unchanged).
// ─────────────────────────────────────────────────────────────────
export { ErrorState } from './error-state';
export { OfflineState } from './offline-state';
export { LoadingButton } from './loading-button';
export { RouteProgress } from './route-progress';

// ─────────────────────────────────────────────────────────────────
// SentryFallback is intentionally NOT re-exported here — it is
// consumed only by `apps/web/instrumentation-client.ts` and the
// global error boundary. Surfacing it through the barrel would
// invite accidental usage inside ordinary page code.
// ─────────────────────────────────────────────────────────────────
