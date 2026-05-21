// apps/web/app/[locale]/admin/security/violations/page.tsx
// ═══════════════════════════════════════════════════════════════
// ADMIN SECURITY → VIOLATIONS — Paginated list with filters
//
// Route: /[locale]/admin/security/violations
//
// Filters:
//   - severity (critical | high | medium | low)
//   - effectiveDirective (any string)
//   - date range (from / to)
//
// Click row → ViolationDetailDrawer slides out with full payload.
//
// TASK #51 UPGRADE
// ────────────────
// The previous full-screen <Loader2> blanked the filter bar during
// pagination and filter changes — disorienting. The upgrade keeps
// the header, filter bar, and pagination row visible at all times
// (Stripe Radar / Linear Issues pattern), and swaps only the table
// body between <DataTableSkeleton> and the live <ViolationTable>.
//
// Skeleton variant: pulse — long-table surface, scroll-heavy, dwell
// time per row is low. The opacity-fade is the right call.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { DataTableSkeleton } from '@/components/feedback/skeletons';
import { useAuthStore } from '@/stores';
import { getAccessToken } from '@/lib/auth';
import { ViolationTable, type ViolationRow } from '../components/violation-table';
import { ViolationDetailDrawer, type ViolationDetail } from '../components/violation-detail-drawer';

const PAGE_SIZE = 50;

type SeverityFilter = '' | 'critical' | 'high' | 'medium' | 'low';

export default function AdminSecurityViolationsPage() {
  const t = useTranslations('admin.security');
  const user = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState<SeverityFilter>('');
  const [directive, setDirective] = useState<string>('');
  const [rows, setRows] = useState<ViolationRow[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ViolationDetail | null>(null);

  const fetchList = useCallback(async () => {
    if (!user) return;

    const token = getAccessToken();
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    if (severity) params.set('severity', severity);
    if (directive) params.set('effectiveDirective', directive);

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/security/violations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = (await res.json()) as {
        success: boolean;
        data: {
          items: ViolationRow[];
          pagination: { total: number; totalPages: number };
        };
      };
      setRows(json.data.items);
      setTotal(json.data.pagination.total);
      setTotalPages(json.data.pagination.totalPages);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, page, severity, directive]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const openDetail = useCallback(
    async (id: string) => {
      if (!user) return;
      const token = getAccessToken();
      if (!token) return;

      setSelectedId(id);
      setDetail(null);

      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      try {
        const res = await fetch(`${apiBase}/api/admin/security/violations/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = (await res.json()) as { success: boolean; data: ViolationDetail };
        setDetail(json.data);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [user],
  );

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('violationsTitle')}</h1>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t('totalResults', { total })}
        </p>
      </header>

      {/* ── Filter bar — always visible, never blanked during loading ─ */}
      <section
        aria-label={t('filtersLabel')}
        className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4"
      >
        <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />

        <Select
          value={severity}
          onValueChange={(v) => {
            setPage(1);
            setSeverity(v as SeverityFilter);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('filterSeverityAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('filterSeverityAll')}</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={directive}
          onChange={(e) => {
            setPage(1);
            setDirective(e.target.value);
          }}
          placeholder={t('filterDirectivePlaceholder')}
          className="max-w-xs"
          aria-label={t('filterDirectiveLabel')}
        />
      </section>

      {/* ── Table — skeleton during loading, ErrorState during error,
            ViolationTable (own empty-state) during success ─────────── */}
      {loading ? (
        <DataTableSkeleton cols={6} rows={10} variant="pulse" />
      ) : error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <ViolationTable rows={rows} onRowClick={openDetail} />
      )}

      {/* ── Pagination — always visible ──────────────────────────── */}
      <nav className="flex items-center justify-between" aria-label={t('paginationLabel')}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t('prev')}
        </Button>

        <span className="text-sm text-muted-foreground" aria-live="polite">
          {t('pageOf', { page, totalPages: totalPages || 1 })}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
        >
          {t('next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </nav>

      {/* ── Detail drawer ────────────────────────────────────── */}
      <ViolationDetailDrawer
        open={selectedId !== null}
        violation={detail}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setSelectedId(null);
            setDetail(null);
          }
        }}
      />
    </main>
  );
}
