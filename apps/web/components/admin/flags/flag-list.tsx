// apps/web/components/admin/flags/flag-list.tsx
// ═══════════════════════════════════════════════════════════════
// FlagList — Admin flag table (Task #49)
// ─────────────────────────────────────────────────────────────────
// Fetches the flag list from `/api/admin/flags` (or `/archived` for
// the archived tab) and renders each row via <FlagRow>. Handles the
// three table states explicitly:
//
//   Loading  → skeleton rows
//   Empty    → empathetic empty state
//   Error    → retry button
//
// Pagination is server-driven (TanStack Query keeps the cursor in
// the query key). Day 1 we ship with a 50-row page — plenty for
// today's ~30 flags. When we cross 200 flags, add the pager.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, FlagOff, AlertCircle } from 'lucide-react';
import type { FeatureFlagDTO } from '@repo/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
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

  if (query.isPending) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed py-16"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

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
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed px-4 py-16 text-center">
        <FlagOff className="size-8 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-medium">
            {view === 'archived' ? 'No archived flags' : 'No active flags yet'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {view === 'archived'
              ? 'Flags appear here after you archive them.'
              : 'Create a flag from PostHog or via POST /api/admin/flags.'}
          </p>
        </div>
      </div>
    );
  }

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
