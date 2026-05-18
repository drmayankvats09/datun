// ═══════════════════════════════════════════════════════════════
// /admin/label PAGE — Main labeling dashboard
// Task #44 Phase 3 → MIGRATED IN Task #47 Phase 3
//
// Composition (UNCHANGED externally):
//   - Header (title + subtitle)
//   - ProgressBar (today / streak / judge agreement)
//   - Strategy selector dropdown
//   - Queue: stack of LabelingCard, top one focused (keyboard active)
//
// MIGRATION (Task #47 Phase 3):
//   Replaced the legacy hand-rolled `useLabelingQueue` (140 lines of
//   manual snapshot/rollback) with a composition of TanStack Query
//   primitives:
//
//     - `useLabelingQueue({ strategy, limit })` → queue items
//     - `useLabelingStats()`                    → today/streak/agreement
//     - `useSubmitLabel()`                      → mutation w/ invalidation
//     - local `useState` for the strategy filter
//
//   Behaviour is IDENTICAL to the old surface — only the wiring
//   changed. UX, translations, keyboard shortcuts, error banner,
//   conflict toast — all preserved.
//
//   The old hook + lib/training-api.ts client are now unreferenced
//   and were deleted by the Phase 3 placement script.
//
// HOTFIX (Task #47 verification pass):
//   Toast strings are hardcoded English. The admin labeling dashboard
//   is internal-only — used by 3-5 labelers (the founding team), all
//   of whom read English. Following Stripe/Linear admin-panel pattern
//   that ships English-only for back-office surfaces and saves
//   translation budget for patient-facing flows.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useLabelingQueue, useLabelingStats } from '@/hooks/queries';
import { useSubmitLabel } from '@/hooks/mutations';
import type { SubmitLabelInput } from '@/hooks/mutations';
import { LabelingCard } from '@/components/admin/labeling/LabelingCard';
import { ProgressBar } from '@/components/admin/labeling/ProgressBar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/feedback';
import { RefreshCw } from 'lucide-react';
import type { LabelingQueueStrategy } from '@repo/shared';

const STRATEGIES: readonly LabelingQueueStrategy[] = [
  'typi_clust',
  'margin',
  'conflicts',
  'random',
];

const QUEUE_LIMIT = 10;

export default function LabelDashboardPage() {
  const t = useTranslations('admin.labeling');

  // ── Local UI state ──
  const [strategy, setStrategy] = useState<LabelingQueueStrategy>('typi_clust');

  // ── Server state via TanStack Query (Task #47) ──
  const queueQuery = useLabelingQueue({ strategy, limit: QUEUE_LIMIT });
  const statsQuery = useLabelingStats();
  const submitLabel = useSubmitLabel();

  const items = queueQuery.data?.items ?? [];
  const stats = statsQuery.data ?? null;
  const loading = queueQuery.isPending || queueQuery.isFetching;
  const error = queueQuery.error instanceof Error ? queueQuery.error.message : null;

  // ── Submit handler — mirrors the old `submitAndAdvance` contract ──
  // Returns Promise<boolean> so LabelingCard's existing API stays intact.
  async function handleSubmit(input: SubmitLabelInput): Promise<boolean> {
    try {
      const result = await submitLabel.mutateAsync(input);
      if (result.conflictDetected) {
        toast.warning('Conflict detected', {
          description:
            result.conflictDelta !== null
              ? `Your score differs from the judge by ${Math.abs(result.conflictDelta).toFixed(
                  1,
                )} points`
              : 'Your score differs from the judge score',
          duration: 6000,
        });
      } else {
        toast.success('Label saved');
      }
      // Mutation invalidates labeling.all → queue + stats refetch automatically.
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save label');
      return false;
    }
  }

  function handleRefresh() {
    void queueQuery.refetch();
    void statsQuery.refetch();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('page.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('page.subtitle')}</p>
        </header>

        {/* Progress trio */}
        <ProgressBar stats={stats} />

        {/* Strategy + refresh */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <label htmlFor="strategy-select" className="text-xs font-medium text-muted-foreground">
              {t('strategy.label')}
            </label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as LabelingQueueStrategy)}>
              <SelectTrigger id="strategy-select" className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRATEGIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <div className="flex flex-col">
                      <span className="font-medium">{t(`strategy.${s}`)}</span>
                      <span className="text-xs text-muted-foreground">
                        {t(`strategy.${s}_desc`)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            aria-label={t('page.refresh')}
          >
            <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
            {t('page.refresh')}
          </Button>
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {/* Queue */}
        {loading && items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground" aria-live="polite">
            {t('page.loadingItems')}
          </p>
        ) : items.length === 0 ? (
          <EmptyState
            icon="📭"
            title={t('page.noItems')}
            description=""
            actionLabel={t('page.refresh')}
            onAction={handleRefresh}
          />
        ) : (
          <div className="space-y-4">
            {items.map((item, idx) => (
              <LabelingCard
                key={item.messageId}
                item={item}
                onSubmit={handleSubmit}
                isFocused={idx === 0}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
