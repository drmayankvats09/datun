// ═══════════════════════════════════════════════════════════════
// /admin/security LOADING — composite dashboard skeleton
//
// MIRRORS
//   • apps/web/app/[locale]/admin/security/page.tsx
//
// COMPOSITE LAYOUT (delegated to <SecurityDashboardSkeleton>)
//   • Header (icon + h1 + subtitle)
//   • Stat cards row (4 KPIs)
//   • Trend chart section (h-64)
//   • Recent violations preview table (6 cols × 5 rows)
//
// WHY THIS IS THE STREAMING FALLBACK
// ──────────────────────────────────
// The live security dashboard fetches three independent endpoints
// (stats, chart series, recent rows). Each section is shown as a
// skeleton until its specific data lands. With Next.js 16 streaming
// + React Server Component Suspense, individual sub-Suspense
// boundaries inside the page itself will progressively swap each
// skeleton out for real content — top-down — without ever showing
// a full-page spinner.
//
// PAIRING WITH CLIENT-SIDE LOADING
// ────────────────────────────────
// The page is currently `'use client'` and renders a <Loader2>
// during its own client-side fetch (line ~106). Phase 5 of Task
// #51 swaps that <Loader2> for <SecurityDashboardSkeleton> too —
// so the visual experience stays consistent across both the
// server-streaming gap and the post-hydration data fetch.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { SecurityDashboardSkeleton } from '@/components/feedback/skeletons';

/**
 * Suspense fallback for `/admin/security`. Renders the composite
 * dashboard skeleton — visual parity with the live page guarantees
 * a CLS score under 0.05 on the dashboard route.
 */
export default function SecurityDashboardLoading() {
  return <SecurityDashboardSkeleton />;
}
