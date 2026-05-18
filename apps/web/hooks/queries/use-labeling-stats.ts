// apps/web/hooks/queries/use-labeling-stats.ts
// ═══════════════════════════════════════════════════════════════
// useLabelingStats / useLabelingConflicts — Task #47 Phase 2
//
// Admin labeling dashboard side-rail:
//   - useLabelingStats     → "Today: 47 / Streak: 12 / Judge agree: 89%"
//   - useLabelingConflicts → top-N conflict items for review queue
//
// Background refresh:
//   The judge ground-truth pipeline is async (BullMQ — Task #41 done),
//   so agreement % updates over time without a user action. We poll
//   every 30s while the tab is visible. The Page Visibility API
//   handling is built into TanStack Query's `refetchInterval` — it
//   pauses when the tab is hidden, resumes on focus.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery } from '@tanstack/react-query';
import type { LabelingStats, LabelConflict } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

const THIRTY_SECONDS_MS = 30_000;

// ─── Stats hook ───────────────────────────────────────────

export function useLabelingStats() {
  return useQuery<LabelingStats>({
    queryKey: queryKeys.labeling.stats(),
    queryFn: ({ signal }) => api.labeling.stats({ signal }),
    staleTime: THIRTY_SECONDS_MS,
    refetchInterval: THIRTY_SECONDS_MS,
  });
}

// ─── Conflicts hook ───────────────────────────────────────

export interface LabelingConflictsData {
  readonly count: number;
  readonly conflicts: readonly LabelConflict[];
}

export function useLabelingConflicts(limit = 20) {
  return useQuery<LabelingConflictsData>({
    queryKey: queryKeys.labeling.conflicts(limit),
    queryFn: ({ signal }) => api.labeling.conflicts(limit, { signal }),
    staleTime: THIRTY_SECONDS_MS,
  });
}
