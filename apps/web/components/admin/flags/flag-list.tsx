// apps/web/components/admin/flags/flag-list.tsx
// ═══════════════════════════════════════════════════════════════
// FlagList — Admin flag table (Task #49)
// ─────────────────────────────────────────────────────────────────
// Fetches the flag list from `/api/admin/flags` (or `/archived` for
// the archived tab) and renders each row via <FlagRow>. Handles the
// three table states explicitly:
//
//   Loading  → table skeleton (Task #51)
//   Empty    → branded EmptyState (Task #51 — view-aware copy)
//   Error    → retry button (untouched — Task #52 scope)
//
// Pagination is server-driven (TanStack Query keeps the cursor in
// the query key). Day 1 we ship with a 50-row page — plenty for
// today's ~30 flags. When we cross 200 flags, add the pager.
//
// TASK #51 UPGRADE
// ────────────────
//   • Loading branch ……… <Loader2> → <DataTableSkeleton cols=5 rows=8>
//   • Empty branch …………… plain text + FlagOff icon →
//                          <EmptyState> (manual mode, view-aware copy)
//   • Error branch ……………… left untouched (Task #52 will refactor)
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery } from '@tanstack/react-query';
import { Flag, AlertCircle } from 'lucide-react';
import type { FeatureFlagDTO } from '@repo/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback';
import { DataTableSkeleton } from '@/components/feedback/skeletons';
import { FlagRow } from './flag-row';

interface FlagListProps {
  readonly view: 'active' | 'archived';
}

interface FlagListResponse {
  readonly items: readonly FeatureFlagDTO[];
  readonly knownKeys?: readonly string[];
  readonly pagination?: {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export function FlagList({ view }: FlagListProps) {
  const query = useQuery<FlagListResponse>({
    queryKey: ['flags', 'admin', 'list', view],
    queryFn: ({ signal }) =>
      view === 'archived'
        ? api.adminFlags.listArchived({ signal })
        : api.adminFlags.list({ signal }),
    staleTime: 15 * 1000,
  });

  // ─── Loading state — table skeleton (Task #51) ──────────────────
  if (query.isPending) {
    return <DataTableSkeleton cols={5} rows={8} variant="pulse" />;
  }

  // ─── Error state — left untouched; Task #52 refactors all errors
  if (query.isError) {
    const message = query.error instanceof Error ? query.error.message : 'Failed to load flags';
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-12 text-center"
        role="alert"
      >
        <AlertCircle className="size-6 text-destructive" aria-hidden />
        <p className="text-sm text-destructive">{message}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const items = query.data?.items ?? [];

  // ─── Empty state — view-aware FAANG copy (Task #51) ─────────────
  if (items.length === 0) {
    if (view === 'archived') {
      return (
        <EmptyState
          icon={Flag}
          tone="neutral"
          title="Your archive is empty"
          description="Flags appear here after you archive them. Nothing has been retired yet."
        />
      );
    }

    return (
      <EmptyState
        icon={Flag}
        tone="neutral"
        title="Ship faster with feature flags"
        description="Roll out changes safely. Toggle features on or off without a redeploy."
      />
    );
  }

  // ─── Populated state ────────────────────────────────────────────
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              Flag
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              Category
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              Rollout
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((flag) => (
            <FlagRow key={flag.id} flag={flag} archived={view === 'archived'} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
