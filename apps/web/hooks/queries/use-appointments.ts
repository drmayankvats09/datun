// apps/web/hooks/queries/use-appointments.ts
// ═══════════════════════════════════════════════════════════════
// useAppointments / useAppointmentDetail — Task #47 Phase 2
//
//   useAppointments(filters)      → paginated list (status, date range)
//   useAppointmentDetail(id)      → single record (status timeline,
//                                    reminders sent, clinic notes)
//
// Used by:
//   - Task #59  clinic owner dashboard (PENDING → CONFIRMED flow)
//   - Task #157 advanced booking & reminder cascade
//   - Patient "My Appointments" page (future)
//
// Cache policy:
//   - staleTime 30s on list: status flips during the clinic's working
//     hours are frequent enough to warrant short freshness
//   - placeholderData keepPreviousData on list: no skeleton flash on
//     status-filter switch
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { AppointmentDTO, PaginatedData } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

const THIRTY_SECONDS_MS = 30_000;

export interface AppointmentFilters {
  readonly status?: string;
  readonly from?: string;
  readonly to?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

// ─── List hook ────────────────────────────────────────────

export function useAppointments(filters: AppointmentFilters = {}) {
  return useQuery<PaginatedData<AppointmentDTO>>({
    queryKey: queryKeys.appointments.list(filters),
    queryFn: ({ signal }) => api.appointments.list(filters, { signal }),
    staleTime: THIRTY_SECONDS_MS,
    placeholderData: keepPreviousData,
  });
}

// ─── Detail hook ──────────────────────────────────────────

export function useAppointmentDetail(id: string | null | undefined) {
  return useQuery<AppointmentDTO>({
    queryKey: queryKeys.appointments.detail(id ?? ''),
    queryFn: ({ signal }) => api.appointments.detail(id!, { signal }),
    enabled: Boolean(id),
    staleTime: THIRTY_SECONDS_MS,
  });
}
