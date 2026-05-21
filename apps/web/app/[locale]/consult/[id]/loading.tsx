// ═══════════════════════════════════════════════════════════════
// /consult/[id] LOADING — deep-link consultation skeleton
//
// MIRRORS
//   • apps/web/app/[locale]/consult/[id]/page.tsx
//
// COVERS
//   • Initial navigation to a consultation URL.
//   • Bookmark / share / reload of an existing consultation.
//
// SKELETON SHAPE (delegated to <ConsultationLoadingSkeleton>)
//   • Brand tile
//   • Title + ID line
//   • Status / welcome line
//   • Mini chat scaffold (AI + user + AI messages)
//
// TWO-PASS LOADING NARRATIVE
// ──────────────────────────
// The consultation page is `'use client'` and reads the Zustand
// store after hydration. Two distinct loading moments occur in
// sequence on a fresh navigation:
//
//   1. Route-level Suspense (this file)
//        Renders during server → client transition for the segment.
//        Shows immediately, before any client JS executes.
//
//   2. Zustand store hydration (page.tsx, replaced in Phase 5)
//        Renders during the brief gap between JS bundle arrival
//        and store rehydration from localStorage.
//
// Both passes render the *same* <ConsultationLoadingSkeleton> —
// the user perceives a continuous loading state rather than two
// distinct UI swaps.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { ConsultationLoadingSkeleton } from '@/components/feedback/skeletons';

/**
 * Suspense fallback for `/consult/[id]`. Renders the
 * brand-aware consultation skeleton — first impression for any
 * patient who arrives via a deep link.
 */
export default function ConsultationLoading() {
  return <ConsultationLoadingSkeleton />;
}
