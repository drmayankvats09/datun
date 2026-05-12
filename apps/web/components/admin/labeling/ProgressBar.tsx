// ═══════════════════════════════════════════════════════════════
// PROGRESS BAR — Daily labeling progress + streak + agreement
// Task #44 Phase 3
//
// Three cards in a row:
//   1. Today's progress (12 / 50)
//   2. Streak (5 days)
//   3. Judge agreement (87% — derived from last 30 days)
//
// Pattern: Linear cycle progress, GitHub contribution graph.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useTranslations } from 'next-intl';
import type { LabelingStats } from '@repo/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, Target, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  stats: LabelingStats | null;
}

export function ProgressBar({ stats }: ProgressBarProps) {
  const t = useTranslations('admin.labeling');

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="h-10" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="h-10" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="h-10" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercent = Math.min(100, (stats.counts.today / stats.dailyTarget) * 100);
  const targetMet = stats.counts.today >= stats.dailyTarget;
  const agreementPercent = Math.round(stats.judgeHumanAgreement * 100);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Today's progress */}
      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Target className="size-3.5" aria-hidden />
              {t('stats.today')}
            </span>
            {targetMet && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-400">
                ✓
              </span>
            )}
          </div>
          <p className="text-2xl font-semibold tabular-nums">
            {stats.counts.today}
            <span className="text-base text-muted-foreground/70"> / {stats.dailyTarget}</span>
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all', targetMet ? 'bg-emerald-500' : 'bg-primary')}
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={stats.counts.today}
              aria-valuemax={stats.dailyTarget}
              aria-label="Daily progress"
            />
          </div>
        </CardContent>
      </Card>

      {/* Streak */}
      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Flame className="size-3.5" aria-hidden />
              {t('page.streak', { days: stats.streakDays })}
            </span>
          </div>
          <p className="text-2xl font-semibold tabular-nums">{stats.streakDays}</p>
          <p className="text-xs text-muted-foreground">
            {stats.counts.allTime.toLocaleString()} all-time
          </p>
        </CardContent>
      </Card>

      {/* Judge agreement */}
      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Scale className="size-3.5" aria-hidden />
              {t('stats.judgeAgreement', { percent: agreementPercent })}
            </span>
          </div>
          <p className="text-2xl font-semibold tabular-nums">{agreementPercent}%</p>
          {stats.conflictsPending > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {t('stats.conflictsPending', { count: stats.conflictsPending })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
