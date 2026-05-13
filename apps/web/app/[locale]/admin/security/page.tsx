// apps/web/app/[locale]/admin/security/page.tsx
// ═══════════════════════════════════════════════════════════════
// ADMIN SECURITY DASHBOARD — Task #45 (CSP)
//
// Route: /[locale]/admin/security
// Gating: parent layout (admin/layout.tsx) checks role ∈ {ADMIN, OWNER}.
//
// Renders:
//   1. StatsCards    — 4 KPIs (today, yesterday, critical, change%)
//   2. ViolationChart — 7-day violation count time series
//   3. ViolationTable — preview of 10 most recent violations
//   4. Link to /admin/security/violations (full paginated list)
//
// Auth pattern: tokens via getAccessToken() from @/lib/auth (localStorage),
// user state via useAuthStore for hydration gating.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, ChevronRight } from 'lucide-react';
import { StatsCards, type SecurityStats } from './components/stats-cards';
import { ViolationChart } from './components/violation-chart';
import { ViolationTable, type ViolationRow } from './components/violation-table';
import { useAuthStore } from '@/stores';
import { getAccessToken } from '@/lib/auth';

interface ViolationsResponse {
  success: boolean;
  data: {
    items: ViolationRow[];
    pagination: { total: number };
  };
}

interface StatsResponse {
  success: boolean;
  data: SecurityStats;
}

export default function AdminSecurityDashboard() {
  const t = useTranslations('admin.security');
  const user = useAuthStore((s) => s.user);

  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [recent, setRecent] = useState<ViolationRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return; // wait for auth hydration

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = getAccessToken();
        if (!token) {
          throw new Error('Not authenticated');
        }

        const headers = { Authorization: `Bearer ${token}` };
        const [statsRes, listRes] = await Promise.all([
          fetch(`${apiBase}/api/admin/security/stats`, { headers, credentials: 'include' }),
          fetch(`${apiBase}/api/admin/security/violations?pageSize=10`, {
            headers,
            credentials: 'include',
          }),
        ]);

        if (!statsRes.ok || !listRes.ok) {
          throw new Error(`API error: stats=${statsRes.status} list=${listRes.status}`);
        }

        const statsJson = (await statsRes.json()) as StatsResponse;
        const listJson = (await listRes.json()) as ViolationsResponse;

        if (cancelled) return;
        setStats(statsJson.data);
        setRecent(listJson.data.items);
        setTotal(listJson.data.pagination.total);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5" />
          <h2 className="font-semibold">{t('errorTitle')}</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      {stats && <StatsCards stats={stats} />}

      <section aria-labelledby="trend-heading" className="space-y-3">
        <h2 id="trend-heading" className="text-xl font-semibold">
          {t('trendTitle')}
        </h2>
        <ViolationChart />
      </section>

      <section aria-labelledby="recent-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-heading" className="text-xl font-semibold">
            {t('recentTitle')}
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/security/violations">
              {t('viewAll', { total })}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <ViolationTable rows={recent} />
      </section>
    </main>
  );
}
