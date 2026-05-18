// apps/web/hooks/mutations/use-submit-label.ts
// ═══════════════════════════════════════════════════════════════
// useSubmitLabel — Task #47 Phase 2
//
// Replaces the manual queue-shift + rollback logic in the old
// `hooks/use-labeling-queue.ts` (~50 lines of hand-rolled snapshot
// management) with TanStack-native invalidation.
//
// Behaviour:
//   - On success: invalidate the queue, stats, and conflicts. The
//     queue query refetches with the next item already promoted on
//     the backend (TypiClust / margin / conflict resampling).
//   - On error: queue stays as-is, the LabelingCard surfaces the
//     error inline. No optimistic shift — keyboard-driven labelers
//     submit fast, and a confirmed UI beats a flicker-prone optimistic one.
//
// Conflict detection:
//   The response carries `conflictDetected` + `conflictDelta`. The
//   admin UI peeks at these via `mutation.data` to flash a "Conflict!"
//   toast when present (existing UX in the old hook).
// ═══════════════════════════════════════════════════════════════

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

export interface SubmitLabelInput {
  readonly messageId: string;
  readonly qualityScore: number;
  readonly isCorrect: boolean;
  readonly correctionText: string | null;
  readonly clinicalNotes: string | null;
  readonly category: string | null;
}

export interface SubmitLabelResponse {
  readonly labelId: string;
  readonly created: boolean;
  readonly conflictDetected: boolean;
  readonly conflictDelta: number | null;
}

export function useSubmitLabel() {
  const queryClient = useQueryClient();

  return useMutation<SubmitLabelResponse, Error, SubmitLabelInput>({
    mutationKey: ['labeling.submit'],

    mutationFn: (input) => api.labeling.submit(input),

    onSuccess: () => {
      // Queue: next item slides into focus
      queryClient.invalidateQueries({
        queryKey: queryKeys.labeling.all,
      });
    },
  });
}
