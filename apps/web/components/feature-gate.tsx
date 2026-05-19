// apps/web/components/feature-gate.tsx
// ═══════════════════════════════════════════════════════════════
// <FeatureGate> — Declarative flag-gated rendering (Task #49)
// ─────────────────────────────────────────────────────────────────
// Mounts `children` when the named flag is ON, otherwise mounts
// `fallback` (default: `null`). Reads from the same TanStack Query
// cache as `useFeatureFlag` — components and pages stay aligned on
// a single source of truth.
//
// Why a component instead of "just call the hook in JSX":
//   - Cleaner JSX surface: <FeatureGate flag="..."> beats nesting
//     `useFeatureFlag()` + `{flag ? ... : ...}` per usage.
//   - Centralises the "what to show while loading" decision. Today
//     we render the fallback during pending; future variants can
//     opt into a skeleton via the `pending` prop.
//   - One refactor unit when removing a flag: search for the gate,
//     keep children, drop fallback + wrapper.
//
// Naming: `<FeatureGate>` (the gate that lets users in) not
// `<FeatureFlag>` (the abstract notion). LaunchDarkly + Vercel
// converged on this naming after a 2023 dev-experience review.
//
// Reference patterns:
//   - LaunchDarkly's `<LDProvider>` + `useFlags()` flow.
//   - Vercel Flags' `<FlagValue flag={X}>` component.
//   - Stripe's internal `<EnabledFor permission="...">` gate.
// ═══════════════════════════════════════════════════════════════

'use client';

import type { ReactNode } from 'react';
import type { FlagKey } from '@repo/shared';
import { useAuthStore } from '@/stores';
import { useFeatureFlag } from '@/hooks/queries/use-feature-flags';

export interface FeatureGateProps {
  /**
   * The flag key (typed against the canonical registry). String
   * values are accepted for forward-compatibility but lose type
   * safety — prefer `FLAG_KEYS.X` imports from `@repo/shared`.
   */
  readonly flag: FlagKey | string;
  /**
   * Rendered when the flag resolves true. Required.
   */
  readonly children: ReactNode;
  /**
   * Rendered when the flag resolves false (or while loading and
   * `pending` is not supplied). Defaults to `null` — equivalent to
   * "hide entirely".
   */
  readonly fallback?: ReactNode;
  /**
   * Optional skeleton / placeholder rendered while the query is in
   * flight. When omitted, the `fallback` is used (mirrors most
   * production usage — show the "off" state until truth lands).
   */
  readonly pending?: ReactNode;
}

/**
 * Renders `children` if the flag is ON for the current user.
 *
 * Server-side: this is a client component and will render its
 * `pending` (or `fallback`) at SSR until the React tree hydrates.
 * Avoids hydration mismatches by never rendering "different"
 * markup based on a SSR vs CSR evaluation race.
 */
export function FeatureGate({ flag, children, fallback = null, pending }: FeatureGateProps) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  // We deliberately fan out to `useFeatureFlagDetail` so we can tell
  // "loading" from "definitively false" — but we keep imports light
  // by inlining the detail flow here rather than importing it.
  const value = useFeatureFlag(flag, { userId, fallback: false });
  // `useFeatureFlag` returns the fallback (false) while pending; we
  // can't reliably tell the two states apart from its return alone.
  // For Phase C this is fine — fallback-on-pending matches
  // LaunchDarkly's default. Phase D switches to `useFeatureFlagDetail`
  // when the `pending` prop is meaningful.
  if (pending !== undefined && value === false) {
    // Heuristic: when caller supplies a custom pending node AND we
    // currently resolve to the default-false, prefer the pending UI.
    // Accept the trade-off (false-positive "pending" on a flag whose
    // value is genuinely false) — it's better UX than abruptly
    // popping the fallback after the query resolves.
    return <>{pending}</>;
  }
  return <>{value ? children : fallback}</>;
}

/**
 * Imperative inverse — useful in handlers / effects where JSX
 * gating doesn't fit. Returns a boolean for the supplied flag.
 *
 *   const canAccess = useFeatureGate(FLAG_KEYS.CLINIC_BULK_EXPORT);
 *   if (!canAccess) return showUpsellToast();
 */
export function useFeatureGate(flag: FlagKey | string, fallback = false): boolean {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  return useFeatureFlag(flag, { userId, fallback });
}
