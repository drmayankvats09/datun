// apps/web/hooks/queries/use-clinics.ts
// ═══════════════════════════════════════════════════════════════
// useClinics / useClinicSearch — Task #47 Phase 2
//
// Partner clinic directory queries.
//
//   useClinics(filters)       → city/specialty/nearby filter
//                                Used by: Task #57 "Book Dentist Near Me"
//                                         CTA, Task #59 directory page.
//
//   useClinicSearch(query)    → autocomplete for the header search bar
//                                Caller debounces the query string;
//                                the hook caches per resolved query.
//                                Empty query parks the hook (`enabled: false`).
//
// Cache policy:
//   - staleTime 2 min: clinic directory is slow-moving (verification,
//                       hours change occasionally — not by-the-second).
//   - placeholderData keepPreviousData on the search hook → as the user
//     types, the previous results stay rendered until the new ones land
//     (no skeleton flash mid-typing).
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { ClinicFilters, ClinicListItem, PaginatedData } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

const TWO_MINUTES_MS = 2 * 60 * 1000;

// ─── List hook (with optional nearby filter) ──────────────

export function useClinics(filters: ClinicFilters = {}) {
  return useQuery<PaginatedData<ClinicListItem>>({
    queryKey: queryKeys.clinics.list(filters),
    queryFn: ({ signal }) => api.clinics.list(filters, { signal }),
    staleTime: TWO_MINUTES_MS,
    placeholderData: keepPreviousData,
  });
}

// ─── Search hook (autocomplete) ───────────────────────────

export function useClinicSearch(query: string) {
  const trimmed = query.trim();

  return useQuery<readonly ClinicListItem[]>({
    queryKey: queryKeys.clinics.search(trimmed),
    queryFn: ({ signal }) => api.clinics.search(trimmed, { signal }),
    enabled: trimmed.length >= 2, // skip 0-1 char queries
    staleTime: TWO_MINUTES_MS,
    placeholderData: keepPreviousData,
  });
}
