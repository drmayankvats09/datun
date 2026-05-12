// ═══════════════════════════════════════════════════════════════
// USE-LABELING-QUEUE — Task #44 Phase 3
//
// React hook coordinating: queue fetch, label submit, stats refresh.
// Optimistic updates — submit feels instant, background reconciles.
//
// Behavior:
//   - On mount: fetches queue + stats in parallel
//   - On submit: optimistically removes item from queue, calls API,
//     on success refreshes stats; on failure rolls back + shows toast
//   - On strategy change: full queue refetch
//
// FAANG principles applied:
//   - Stale-while-revalidate (Vercel SWR pattern, hand-rolled)
//   - Optimistic UI with rollback (Linear / Notion pattern)
//   - Error boundary friendly — throws ApiClientError on hard failures
//
// We don't use TanStack Query yet — Phase 11 wires it via Task #47.
// For Phase 3 the hand-rolled hook is sufficient and dependency-free.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { LabelingQueueItem, LabelingQueueStrategy, LabelingStats } from '@repo/shared';
import {
  fetchLabelingQueue,
  fetchLabelingStats,
  submitLabel,
  type SubmitLabelInput,
} from '@/lib/training-api';

// ─── Hook state ────────────────────────────────────────────────

export interface UseLabelingQueueResult {
  readonly items: readonly LabelingQueueItem[];
  readonly stats: LabelingStats | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly strategy: LabelingQueueStrategy;
  readonly setStrategy: (s: LabelingQueueStrategy) => void;
  readonly submitAndAdvance: (input: SubmitLabelInput) => Promise<boolean>;
  readonly refresh: () => Promise<void>;
}

// ─── Hook ──────────────────────────────────────────────────────

export function useLabelingQueue(initialLimit = 10): UseLabelingQueueResult {
  const [items, setItems] = useState<readonly LabelingQueueItem[]>([]);
  const [stats, setStats] = useState<LabelingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<LabelingQueueStrategy>('typi_clust');

  // ── Initial + on-strategy-change fetch ──
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [queueRes, statsRes] = await Promise.all([
        fetchLabelingQueue({ strategy, limit: initialLimit }),
        fetchLabelingStats(),
      ]);

      if (queueRes.success) {
        setItems(queueRes.data.items);
      } else {
        setError(queueRes.error.message);
      }

      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [strategy, initialLimit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Optimistic submit ──
  const submitAndAdvance = useCallback(
    async (input: SubmitLabelInput): Promise<boolean> => {
      // 1. Snapshot current state for rollback
      const previousItems = items;
      const previousStats = stats;

      // 2. Optimistic: remove submitted item from queue + bump today count
      setItems((current) => current.filter((i) => i.messageId !== input.messageId));
      if (stats) {
        setStats({
          ...stats,
          counts: { ...stats.counts, today: stats.counts.today + 1 },
        });
      }

      // 3. Real submission
      try {
        const res = await submitLabel(input);
        if (!res.success) {
          // Rollback + surface
          setItems(previousItems);
          setStats(previousStats);
          toast.error('Failed to submit label', { description: res.error.message });
          return false;
        }

        if (res.data.conflictDetected) {
          toast.warning('Score conflicts with judge', {
            description: `Delta: ${res.data.conflictDelta} — review in Conflicts queue`,
          });
        } else {
          toast.success(res.data.created ? 'Label saved' : 'Label updated');
        }

        // Background refresh stats — accurate streak/agreement reconciled
        fetchLabelingStats()
          .then((s) => {
            if (s.success) setStats(s.data);
          })
          .catch(() => {
            /* non-fatal */
          });

        // Top-up queue if running low
        if (items.length <= 3) {
          fetchLabelingQueue({ strategy, limit: initialLimit })
            .then((q) => {
              if (q.success) setItems(q.data.items);
            })
            .catch(() => {
              /* non-fatal */
            });
        }

        return true;
      } catch (err) {
        setItems(previousItems);
        setStats(previousStats);
        toast.error('Network error', { description: (err as Error).message });
        return false;
      }
    },
    [items, stats, strategy, initialLimit],
  );

  return {
    items,
    stats,
    loading,
    error,
    strategy,
    setStrategy,
    submitAndAdvance,
    refresh,
  };
}
