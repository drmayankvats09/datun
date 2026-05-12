// ═══════════════════════════════════════════════════════════════
// /admin/label PAGE — Main labeling dashboard
// Task #44 Phase 3
//
// Composition:
//   - Header (title + subtitle)
//   - ProgressBar (today / streak / judge agreement)
//   - Strategy selector dropdown
//   - Queue: stack of LabelingCard, top one focused (keyboard active)
//
// Pattern: Linear inbox, GitHub PR review queue.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useTranslations } from 'next-intl';
import { useLabelingQueue } from '@/hooks/use-labeling-queue';
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

export default function LabelDashboardPage() {
  const t = useTranslations('admin.labeling');
  const { items, stats, loading, error, strategy, setStrategy, submitAndAdvance, refresh } =
    useLabelingQueue(10);

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
            onClick={() => refresh()}
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
            onAction={() => refresh()}
          />
        ) : (
          <div className="space-y-4">
            {items.map((item, idx) => (
              <LabelingCard
                key={item.messageId}
                item={item}
                onSubmit={submitAndAdvance}
                isFocused={idx === 0}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
