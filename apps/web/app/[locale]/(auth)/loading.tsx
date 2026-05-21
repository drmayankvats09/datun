// ═══════════════════════════════════════════════════════════════
// (AUTH) GROUP LOADING — Suspense fallback for every auth route
//
// COVERS
//   • /login
//   • /signup
//   • /forgot-password
//   • Any future route added under `apps/web/app/[locale]/(auth)/`
//     (e.g. Apple sign-in, magic-link, password-reset confirmation).
//
// NEXT.JS 16 CONVENTION
// ─────────────────────
// A `loading.tsx` file placed inside a route group acts as the
// Suspense boundary for every page in that group. We get login,
// signup, and forgot-password coverage with a single file — exactly
// how Stripe / Linear / Vercel structure their auth-loading states.
//
// WHY A SKELETON, NOT A SPINNER
// ──────────────────────────────
// Auth is the single highest-conversion surface in any product.
// Showing a spinner here costs activation: the user perceives the
// page as broken or slow. Showing a layout-faithful skeleton
// signals "your sign-in form is loading right here, in the same
// place it will render".
//
// MOTION ADAPTIVITY
// ─────────────────
// The shimmer variant inside <AuthFormSkeleton> reads
// `useMotionLevel()` — on 2G / 3G / `prefers-reduced-motion` it
// degrades to a static muted block. Zero per-component plumbing
// required here.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { AuthFormSkeleton } from '@/components/feedback/skeletons';

/**
 * Suspense fallback for all routes under the `(auth)` group.
 *
 * Centers the skeleton vertically and horizontally within the
 * viewport — matching the bounding box used by the live login,
 * signup, and forgot-password pages.
 */
export default function AuthGroupLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <AuthFormSkeleton />
    </main>
  );
}
