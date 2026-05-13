// apps/web/app/[locale]/admin/security/components/stats-cards.tsx
// ═══════════════════════════════════════════════════════════════
// STATS CARDS — 4 KPIs for the security dashboard hero row
// ═══════════════════════════════════════════════════════════════

'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, ShieldCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/** Shape matches API GET /admin/security/stats response. */
export interface SecurityStats {
  today: number;
  yesterday: number;
  criticalToday: number;
  changeVsYesterdayPct: number | null;
  topDirectives: Array<{ directive: string; count: number }>;
}

interface Props {
  stats: SecurityStats;
}

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>—</span>
      </div>
    );
  }
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const className =
    pct > 0
      ? 'text-destructive'
      : pct < 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-muted-foreground';
  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      <Icon className="h-3 w-3" />
      <span>
        {pct > 0 ? '+' : ''}
        {pct}%
      </span>
    </div>
  );
}

export function StatsCards({ stats }: Props) {
  const t = useTranslations('admin.security.stats');
  const topDirective = stats.topDirectives[0];

  return (
    <section
      aria-label={t('label')}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('today')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-semibold tabular-nums">{stats.today}</span>
            <ChangeBadge pct={stats.changeVsYesterdayPct} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('yesterdayLine', { count: stats.yesterday })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1 text-sm font-medium text-destructive">
            <ShieldAlert className="h-4 w-4" />
            {t('criticalToday')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold text-destructive tabular-nums">
            {stats.criticalToday}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t('criticalHint')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            {t('topDirective')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="truncate font-mono text-lg" title={topDirective?.directive ?? '—'}>
            {topDirective?.directive ?? '—'}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {topDirective ? t('topDirectiveHint', { count: topDirective.count }) : t('noData')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('windowLabel')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums">24h</div>
          <p className="mt-1 text-xs text-muted-foreground">{t('windowHint')}</p>
        </CardContent>
      </Card>
    </section>
  );
}
