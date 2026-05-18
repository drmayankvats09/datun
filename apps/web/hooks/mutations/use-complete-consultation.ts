// apps/web/hooks/mutations/use-complete-consultation.ts
// ═══════════════════════════════════════════════════════════════
// useCompleteConsultation — Task #47 Phase 2
//
// Mark a consultation as COMPLETED → backend finalises the
// assessment, queues PDF generation (BullMQ — Task #41), and
// dispatches the `consultation_complete` WhatsApp template.
//
// Cache invalidation:
//   - Detail key   → status flips, assessment now non-null
//   - Lists key    → completed badge appears in history drawer
//                    and clinic dashboard
//   - PDF key      → fresh signed URL fetch becomes valid
//
// NOT optimistic — this is a terminal action; the user expects
// a brief loading state ("Completing..." button) before the
// summary card renders. Optimistic on terminal mutations risks
// showing a "completed" UI that the server later rejects.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CompleteConsultationResponse } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

export interface UseCompleteConsultationOptions {
  readonly consultationId: string;
}

export function useCompleteConsultation(options: UseCompleteConsultationOptions) {
  const { consultationId } = options;
  const queryClient = useQueryClient();

  return useMutation<CompleteConsultationResponse, Error, void>({
    mutationKey: ['consultations.complete', consultationId],

    mutationFn: () => api.consultations.complete(consultationId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.consultations.detail(consultationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.consultations.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.consultations.pdf(consultationId),
      });
    },
  });
}
