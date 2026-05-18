// apps/web/hooks/queries/use-clinic-detail.ts
// ═══════════════════════════════════════════════════════════════
// useClinicDetail — Task #47 Phase 2
//
// Full clinic profile: hours, services, contact info, subscription tier.
//
// Used by:
//   - Task #57 "Book here" modal (after assessment)
//   - Task #59 clinic profile page (patient-facing)
//
// Cache policy:
//   - staleTime 2 min: profile data is slow-moving (hours/services
//     change occasionally, not real-time).
//   - `enabled` gated by id truthiness so callers can safely use this
//     hook before a route param resolves.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery } from '@tanstack/react-query';
import type { ClinicDetail } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

const TWO_MINUTES_MS = 2 * 60 * 1000;

export function useClinicDetail(id: string | null | undefined) {
  return useQuery<ClinicDetail>({
    queryKey: queryKeys.clinics.detail(id ?? ''),
    queryFn: ({ signal }) => api.clinics.detail(id!, { signal }),
    enabled: Boolean(id),
    staleTime: TWO_MINUTES_MS,
  });
}
