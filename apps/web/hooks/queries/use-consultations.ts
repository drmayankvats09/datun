// apps/web/hooks/queries/use-consultations.ts
// ═══════════════════════════════════════════════════════════════
// useConsultations / useInfiniteConsultations — Task #47 Phase 2
// HOTFIX (Task #47 verification pass):
//   PaginationMeta in @repo/shared exposes `hasMore`, not
//   `hasNextPage`. Renamed for the canonical field name so the
//   shared envelope schema is the single source of truth.
//
// TWO hooks for one resource — same data, different UX shapes:
//
//   useConsultations(filters)
//     - Classic page-numbered list (page=1, page=2 …)
//     - Uses `placeholderData: keepPreviousData` so navigating
//       between pages doesn't flash a loading skeleton
//
//   useInfiniteConsultations(filters)
//     - Infinite scroll (Stripe Dashboard pattern)
//     - `getNextPageParam` reads `pagination.hasMore` and returns
//       the next page number; returns `undefined` to stop
//
// Why two hooks instead of one option flag:
//   - The two query shapes are fundamentally different in TanStack
//     Query (`useQuery` vs `useInfiniteQuery`).
//   - Cache keys differ (`.list(filters)` vs `.infinite(filters)`),
//     so the two never collide.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import type { ConsultationFilters, ConsultationListItem, PaginatedData } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

const ONE_MINUTE_MS = 60_000;

// ─── Classic paginated list ───────────────────────────────

export function useConsultations(filters: ConsultationFilters = {}) {
  return useQuery<PaginatedData<ConsultationListItem>>({
    queryKey: queryKeys.consultations.list(filters),
    queryFn: ({ signal }) => api.consultations.list(filters, { signal }),
    staleTime: ONE_MINUTE_MS,
    // Show previous page's data while next page loads — no skeleton flash.
    placeholderData: keepPreviousData,
  });
}

// ─── Infinite scroll variant ──────────────────────────────

/**
 * Per-page payload + the pagination metadata so the next-page
 * resolver can compute its target.
 */
type ConsultationsPage = PaginatedData<ConsultationListItem>;

export function useInfiniteConsultations(
  filters: Omit<ConsultationFilters, 'page'> = {},
  pageSize = 20,
) {
  return useInfiniteQuery<
    ConsultationsPage,
    Error,
    { pages: ConsultationsPage[]; pageParams: number[] },
    ReturnType<typeof queryKeys.consultations.infinite>,
    number
  >({
    queryKey: queryKeys.consultations.infinite({ ...filters, pageSize }),
    queryFn: ({ pageParam, signal }) =>
      api.consultations.list({ ...filters, page: pageParam, pageSize }, { signal }),
    initialPageParam: 1,
    // Canonical pagination field is `hasMore` (see envelope.schema.ts).
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    staleTime: ONE_MINUTE_MS,
  });
}
