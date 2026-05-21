// ═══════════════════════════════════════════════════════════════
// AUTH FORM SKELETON — login / signup / forgot-password loader
//
// MIRRORS
//   • apps/web/app/[locale]/(auth)/login/page.tsx
//   • apps/web/app/[locale]/(auth)/signup/page.tsx
//   • apps/web/app/[locale]/(auth)/forgot-password/page.tsx
//
// SHAPE
//   ┌───────────────────────────────────────┐
//   │   ╶╶╶╶╶╶╶╶╶╶╶╶          (logo / title)│
//   │   ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶          │
//   │                                       │
//   │   [   Continue with Google    ]       │   OAuth pill
//   │                                       │
//   │   ─── or sign in with email ───        │   divider
//   │                                       │
//   │   [ Email                       ]      │   field
//   │   [ Password                    ]      │   field
//   │   [          Sign in           ]       │   submit
//   │                                       │
//   │   ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶                │   fine print
//   └───────────────────────────────────────┘
//
// HEIGHT BUDGET ≈ 360 px (form area).
// VARIANT       shimmer — first activation surface, conversion-critical.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface AuthFormSkeletonProps {
  /**
   * Whether to render the OAuth pill + divider. Defaults to true —
   * login and signup both ship OAuth. Pass false for the
   * forgot-password screen which has email-only entry.
   */
  showOAuth?: boolean;

  /**
   * Tailwind classes appended to the outer wrapper. Defaults
   * already center the form on the page.
   */
  className?: string;
}

/**
 * A login-shaped skeleton — title, optional OAuth row, divider,
 * two input fields, primary submit button, and a small fine-print
 * line. Matches the live auth pages' bounding box exactly.
 */
export function AuthFormSkeleton({ showOAuth = true, className }: AuthFormSkeletonProps) {
  return (
    <div
      className={cn('mx-auto w-full max-w-md space-y-5 px-4 py-12', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading sign-in form"
    >
      {/* Title + subtitle */}
      <div className="space-y-2 text-center">
        <Skeleton variant="shimmer" className="mx-auto h-7 w-48" />
        <Skeleton variant="shimmer" className="mx-auto h-4 w-64" />
      </div>

      {showOAuth ? (
        <>
          {/* OAuth pill */}
          <Skeleton variant="shimmer" className="h-11 w-full rounded-lg" />

          {/* Divider with text */}
          <div className="relative my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" aria-hidden="true" />
            <Skeleton variant="shimmer" className="h-3 w-20" />
            <div className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
        </>
      ) : null}

      {/* Email field */}
      <div className="space-y-2">
        <Skeleton variant="shimmer" className="h-3 w-16" />
        <Skeleton variant="shimmer" className="h-11 w-full rounded-lg" />
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <Skeleton variant="shimmer" className="h-3 w-20" />
        <Skeleton variant="shimmer" className="h-11 w-full rounded-lg" />
      </div>

      {/* Submit button */}
      <Skeleton variant="shimmer" className="h-11 w-full rounded-lg" />

      {/* Fine print */}
      <div className="space-y-2 pt-2">
        <Skeleton variant="shimmer" className="mx-auto h-3 w-56" />
        <Skeleton variant="shimmer" className="mx-auto h-3 w-40" />
      </div>
    </div>
  );
}
