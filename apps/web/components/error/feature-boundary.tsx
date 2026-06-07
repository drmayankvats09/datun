// apps/web/components/error/feature-boundary.tsx
// ═══════════════════════════════════════════════════════════════
// FEATURE BOUNDARY — Section-level error boundary (Task #52 Phase 2)
//
// Composes the ErrorBoundary primitive with TanStack Query's
// `QueryErrorResetBoundary` so that when the user clicks "Try again":
//
//   1. The boundary's own state clears (children re-mount)
//   2. ALL queries inside the boundary's scope are marked stale and
//      will refetch when consumers re-mount
//
// Why this matters:
//   - Without the QueryErrorResetBoundary integration, retrying a
//     boundary leaves errored queries in their failed state. The
//     next render reads the same cached failure and immediately
//     throws again — infinite retry loop, broken UX.
//   - With it, the children re-mount with a clean cache slot.
//
// The component is a function (not a class) — it just wires together
// two existing pieces. The actual error catching happens inside the
// class-based ErrorBoundary primitive.
//
// References:
//   - https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary
//   - https://tanstack.com/query/latest/docs/framework/react/guides/suspense
// ═══════════════════════════════════════════════════════════════

'use client';

import React from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';

import { ErrorBoundary } from '@/components/a11y';
import type { ErrorBoundaryFallbackProps } from '@/components/a11y/error-boundary';
import { WidgetError } from './widget-error';

// ─── Props ─────────────────────────────────────────────────────

export interface FeatureBoundaryProps {
  /** The protected feature subtree. */
  readonly children: React.ReactNode;
  /**
   * Human-readable feature identifier. Used for analytics and audit
   * log breadcrumbs — keep lowercase_snake_case (e.g., 'consultation_chat',
   * 'photo_uploader', 'clinic_list'). NOT user-facing.
   */
  readonly name: string;
  /**
   * Custom fallback. Two shapes supported:
   *   - ReactNode      — static UI
   *   - Render prop    — function receiving Phase 1's fallback props,
   *                       so consumers can build category-aware UIs
   *
   * Defaults to `<WidgetError />` rendered with the feature name.
   */
  readonly fallback?: React.ReactNode | ((props: ErrorBoundaryFallbackProps) => React.ReactNode);
  /**
   * If any of these values changes between renders, the boundary
   * auto-resets. Useful for switching between feature inputs
   * (e.g., changing the consultation ID).
   */
  readonly resetKeys?: ReadonlyArray<string | number | boolean | null | undefined>;
  /**
   * Optional callback invoked alongside the standard
   * queryClient.resetQueries() when "Try again" is clicked. Use for
   * Zustand slice resets or other state cleanups specific to the
   * feature (e.g., clear a streaming buffer).
   */
  readonly onReset?: () => void;
}

// ─── Component ─────────────────────────────────────────────────

/**
 * Wrap a feature section so errors inside it surface as an inline
 * widget UI rather than bubbling up to the route or app boundary.
 *
 * @example
 *   <FeatureBoundary name="consultation_chat">
 *     <ChatMessages />
 *     <ChatInput />
 *   </FeatureBoundary>
 *
 * @example with custom fallback
 *   <FeatureBoundary
 *     name="photo_uploader"
 *     fallback={({ resetBoundary }) => (
 *       <UploadErrorCard onRetry={resetBoundary} />
 *     )}
 *   >
 *     <PhotoUploader />
 *   </FeatureBoundary>
 */
export function FeatureBoundary({
  children,
  name,
  fallback,
  resetKeys,
  onReset,
}: FeatureBoundaryProps): React.ReactElement {
  return (
    <QueryErrorResetBoundary>
      {({ reset: resetQueries }) => (
        <ErrorBoundary
          level="feature"
          onReset={() => {
            // Compose query reset with the caller's optional reset
            // work. Errors in either branch are absorbed by the
            // ErrorBoundary's own onReset error-handling.
            try {
              resetQueries();
            } finally {
              onReset?.();
            }
          }}
          resetKeys={resetKeys}
          fallback={
            fallback ?? ((fallbackProps) => <WidgetError {...fallbackProps} featureName={name} />)
          }
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
