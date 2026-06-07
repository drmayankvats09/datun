// apps/web/components/error/index.ts
// ═══════════════════════════════════════════════════════════════
// ERROR COMPONENTS — Barrel export
//
// Public surface of the error UI layer. Components and route pages
// should import from `@/components/error`, NEVER from sub-paths, so
// internal reorganisation is invisible to consumers.
//
// Allowed:    import { FeatureBoundary, WidgetError } from '@/components/error'
// Forbidden:  import { WidgetError } from '@/components/error/widget-error'
//
// The class-based ErrorBoundary primitive lives at
// `components/a11y/error-boundary.tsx` for backward compatibility
// with the existing app-provider import. Re-exported here for
// consistency, so new code can use a single import surface.
//
// Phase 3 ESLint rule (planned): `no-restricted-imports` blocks
// `@/components/error/*` sub-paths, enforces the public surface.
// ═══════════════════════════════════════════════════════════════

// ─── Primitive (lives in a11y for backward compat) ─────────────
export {
  ErrorBoundary,
  type ErrorBoundaryProps,
  type ErrorBoundaryFallbackProps,
  type ErrorBoundaryLevel,
} from '@/components/a11y/error-boundary';

// ─── Composed boundaries ───────────────────────────────────────
export { FeatureBoundary, type FeatureBoundaryProps } from './feature-boundary';

// ─── UI variants ───────────────────────────────────────────────
export { WidgetError, type WidgetErrorProps } from './widget-error';
export { RouteError, type RouteErrorProps } from './route-error';
export { AppError, type AppErrorProps, type AppErrorCopy } from './app-error';

// ─── Shared primitives ─────────────────────────────────────────
export { ErrorCard, type ErrorCardProps, type ErrorCardSize } from './error-card';
export { RetryButton, type RetryButtonProps } from './retry-button';

// ─── Illustrations ─────────────────────────────────────────────
export {
  getIllustrationFor,
  NetworkIllustration,
  AuthIllustration,
  ValidationIllustration,
  RateLimitIllustration,
  NotFoundIllustration,
  ServerIllustration,
  AiServiceIllustration,
  ConsultationStateIllustration,
  ChunkLoadIllustration,
  UnknownIllustration,
  type IllustrationProps,
} from './error-illustrations';
