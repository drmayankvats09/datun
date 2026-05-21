// ═══════════════════════════════════════════════════════════════
// ADMIN GATE SKELETON — auth-hydration placeholder
//
// MIRRORS
//   • apps/web/app/[locale]/admin/layout.tsx (the !hydrated branch
//     that today renders a bare <Loader2>).
//
// SHAPE
//   Full-viewport flex container, with a small centered card
//   carrying a logo tile, two title lines, and a thin progress bar.
//
//   ┌─────────────────────────────────────────────────────────┐
//   │                                                         │
//   │                       ┌─────┐                           │
//   │                       │ ░░░ │   ← logo tile             │
//   │                       └─────┘                           │
//   │                   ╶╶╶╶╶╶╶╶╶╶╶╶╶╶                        │
//   │                   ╶╶╶╶╶╶╶╶╶╶╶╶                          │
//   │                   ─────────────                          │
//   │                                                         │
//   └─────────────────────────────────────────────────────────┘
//
// HEIGHT BUDGET
//   100 vh — fills the viewport. Centered card sits at ~200 px.
//
// VARIANT
//   pulse — this surface flashes for ≤ 300 ms in 95% of sessions
//   (Zustand hydrates fast). A shimmer sweep barely begins before
//   the real layout takes over.
//
// PROFESSIONAL TONE
//   No spinner — Stripe / Linear / Vercel never show a bare
//   spinner on admin entry. They show a *brand-aware*
//   placeholder. We do the same.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface AdminGateSkeletonProps {
  /** Optional Tailwind classes appended to the outer wrapper. */
  className?: string;
}

/**
 * Centered admin-entry placeholder. Replaces the bare spinner that
 * currently renders during Zustand store hydration on /admin/*.
 */
export function AdminGateSkeleton({ className }: AdminGateSkeletonProps) {
  return (
    <main
      className={cn('flex min-h-screen items-center justify-center bg-background px-6', className)}
      role="status"
      aria-busy="true"
      aria-label="Verifying admin access"
    >
      <div className="w-full max-w-xs space-y-4 text-center">
        {/* Logo / brand tile */}
        <Skeleton variant="pulse" className="mx-auto h-12 w-12 rounded-2xl" />

        {/* Two title lines */}
        <div className="space-y-2">
          <Skeleton variant="pulse" className="mx-auto h-4 w-40" />
          <Skeleton variant="pulse" className="mx-auto h-3 w-28" />
        </div>

        {/* Thin progress bar */}
        <Skeleton variant="pulse" className="mx-auto h-1 w-32 rounded-full" />
      </div>
    </main>
  );
}
