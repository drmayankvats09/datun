// apps/web/hooks/queries/use-labeling-queue.ts
// ═══════════════════════════════════════════════════════════════
// useLabelingQueue — Task #47 Phase 2
//
// Admin labeling dashboard queue. Strategy-driven (typi_clust /
// margin / conflicts / random) — Task #44 phase 2 wired the
// backend, Task #47 replaces the hand-rolled hook at
// `hooks/use-labeling-queue.ts` (~140 lines of SWR + optimistic
// rollback). Phase 3 deletes the old file once consumers migrate.
//
// Cache policy:
//   - staleTime 0: labeling queue is dynamic — every submit refills
//     it, every conflict detection reorders it. We accept the chatter
//     here because the admin user-base is tiny (3-5 labelers).
//   - The submit mutation (use-submit-label.ts) invalidates this key
//     so the next item appears without manual refetch.
//
// `limit` is a hook param (default 10) so the admin page can render
// e.g. 5 cards at a time on mobile, 10 on desktop.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery } from '@tanstack/react-query';
import type { LabelingQueueItem, LabelingQueueStrategy } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

export interface UseLabelingQueueOptions {
  readonly strategy: LabelingQueueStrategy;
  readonly limit?: number;
  readonly enabled?: boolean;
}

export interface LabelingQueueData {
  readonly strategy: LabelingQueueStrategy;
  readonly count: number;
  readonly items: readonly LabelingQueueItem[];
}

export function useLabelingQueue(options: UseLabelingQueueOptions) {
  const { strategy, limit = 10, enabled = true } = options;

  return useQuery<LabelingQueueData>({
    queryKey: queryKeys.labeling.queue(strategy, limit),
    queryFn: ({ signal }) => api.labeling.queue({ strategy, limit }, { signal }),
    enabled,
    staleTime: 0,
  });
}
