// apps/web/app/[locale]/admin/security/components/violation-chart.tsx
// ═══════════════════════════════════════════════════════════════
// VIOLATION CHART — 7-day time series (Recharts)
//
// Data: aggregated client-side from a single /violations request scoped
// to the last 7 days. Buckets by calendar day in viewer's timezone.
//
// TASK #51 UPGRADE
// ────────────────
// The previous <Loader2> placeholder has been replaced with
// <ChartSkeleton>. The skeleton frame matches the live chart's
// outer card + h-64 body + legend row, so CLS stays at zero when
// the Recharts SVG paints in.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ChartSkeleton } from '@/components/feedback/skeletons';
import { useAuthStore } from '@/stores';
import { getAccessToken } from '@/lib/auth';

interface BucketPoint {
  date: string; // YYYY-MM-DD
  count: number;
  critical: number;
}

interface ApiListItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
}

function bucketByDay(items: ApiListItem[]): BucketPoint[] {
  const buckets = new Map<string, { count: number; critical: number }>();
  const now = new Date();
  // Seed last 7 days so chart shows continuous x-axis.
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { count: 0, critical: 0 });
  }
  for (const item of items) {
    const key = new Date(item.createdAt).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue; // older than 7 days — ignore
    bucket.count++;
    if (item.severity === 'critical') bucket.critical++;
  }
  return Array.from(buckets.entries()).map(([date, b]) => ({
    date: date.slice(5), // MM-DD (locale-agnostic compact label)
    count: b.count,
    critical: b.critical,
  }));
}

export function ViolationChart() {
  const t = useTranslations('admin.security.chart');
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<ApiListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

    async function load() {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const params = new URLSearchParams({ pageSize: '500', from: sevenDaysAgo });
      try {
        const res = await fetch(`${apiBase}/api/admin/security/violations?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const json = (await res.json()) as { data: { items: ApiListItem[] } };
        if (!cancelled) setItems(json.data.items);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const data = useMemo(() => bucketByDay(items), [items]);

  if (loading) {
    return <ChartSkeleton />;
  }

  return (
    <div className="rounded-md border bg-card p-4" role="img" aria-label={t('alt')}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis allowDecimals={false} className="text-xs" />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                fontSize: '0.75rem',
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name={t('totalSeries')}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="critical"
              name={t('criticalSeries')}
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
