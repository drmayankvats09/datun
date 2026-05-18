// apps/web/hooks/queries/use-health-score.ts
// ═══════════════════════════════════════════════════════════════
// useHealthScore / useHealthScoreHistory — Task #47 Phase 2 (stub)
//
// Dental health score — current value + 6-month trend graph.
//
// Future: Task #32 wires the backend (BullMQ job aggregates monthly).
// Types live HERE temporarily; they will move to
// `@repo/shared/types/health-score.ts` when Task #32 lands so backend
// can share them.
//
// Cache policy:
//   - staleTime 1 hour: score is computed nightly. No need to refetch
//     every 60s.
//   - History query: staleTime 6 hours (graph is even slower-moving).
//
// We use authFetch + ENDPOINTS directly because `api.healthScore.*`
// namespace is not yet in api-client.ts (Phase 1 stays untouched).
// Task #32 will promote these to api-client methods.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery } from '@tanstack/react-query';
import { authFetch, ENDPOINTS } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

const ONE_HOUR_MS = 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * ONE_HOUR_MS;

// ─── Temporary local DTOs (will move to @repo/shared on Task #32) ──

export interface HealthScoreDTO {
  /** 0-100 composite score. */
  readonly score: number;
  /** ISO-8601 when this score was last computed. */
  readonly computedAt: string;
  /** Component breakdown (gum / cavity / hygiene / etc.). */
  readonly breakdown: Readonly<Record<string, number>>;
}

export interface HealthScoreHistoryPoint {
  /** ISO-8601 (YYYY-MM-DD) — beginning of bucket. */
  readonly date: string;
  readonly score: number;
}

export type HealthScoreRange = '30d' | '90d' | '180d' | '365d';

// ─── Current score ────────────────────────────────────────

export function useHealthScore() {
  return useQuery<HealthScoreDTO>({
    queryKey: queryKeys.healthScore.current(),
    queryFn: ({ signal }) =>
      authFetch<HealthScoreDTO>(ENDPOINTS.healthScore.current, {
        method: 'GET',
        signal,
      }),
    staleTime: ONE_HOUR_MS,
  });
}

// ─── History ──────────────────────────────────────────────

export function useHealthScoreHistory(range: HealthScoreRange = '180d') {
  return useQuery<readonly HealthScoreHistoryPoint[]>({
    queryKey: queryKeys.healthScore.history(range),
    queryFn: ({ signal }) =>
      authFetch<readonly HealthScoreHistoryPoint[]>(
        `${ENDPOINTS.healthScore.history}?range=${encodeURIComponent(range)}`,
        { method: 'GET', signal },
      ),
    staleTime: SIX_HOURS_MS,
  });
}
