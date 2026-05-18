// apps/web/hooks/mutations/use-book-appointment.ts
// ═══════════════════════════════════════════════════════════════
// useBookAppointment / useCancelAppointment — Task #47 Phase 2
//
// Patient-side booking flow:
//   - useBookAppointment   → POST /api/appointments (PENDING status)
//   - useCancelAppointment → POST /api/appointments/:id/cancel
//
// Invalidation policy:
//   - Book   → lists key (new row appears), clinic detail
//              (availability count may have shifted)
//   - Cancel → specific detail + lists (status flips)
//
// NOT optimistic — both flows are user-initiated transactional
// actions with server-side validation (slot availability, business
// hours, double-booking checks). Optimistic UI here would risk
// showing a confirmed appointment that the server later rejects.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppointmentDTO, BookAppointmentInput, CancelAppointmentInput } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

// ─── Book ─────────────────────────────────────────────────

export function useBookAppointment() {
  const queryClient = useQueryClient();

  return useMutation<AppointmentDTO, Error, BookAppointmentInput>({
    mutationKey: ['appointments.book'],

    mutationFn: (input) => api.appointments.book(input),

    onSuccess: (appointment) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clinics.detail(appointment.clinicId),
      });
    },
  });
}

// ─── Cancel ───────────────────────────────────────────────

export interface CancelAppointmentVars {
  readonly id: string;
  readonly input: CancelAppointmentInput;
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation<AppointmentDTO, Error, CancelAppointmentVars>({
    mutationKey: ['appointments.cancel'],

    mutationFn: ({ id, input }) => api.appointments.cancel(id, input),

    onSuccess: (appointment) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.detail(appointment.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.lists(),
      });
    },
  });
}
