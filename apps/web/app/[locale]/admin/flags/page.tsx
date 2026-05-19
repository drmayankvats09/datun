// apps/web/app/[locale]/admin/flags/page.tsx
// ═══════════════════════════════════════════════════════════════
// /admin/flags PAGE — Feature flag dashboard (Task #49)
// ─────────────────────────────────────────────────────────────────
// Composition:
//   Header (title + subtitle + sync/cache controls)
//   Tabs (Active / Archived)
//   FlagList (paginated table)
//
// Auth: gated by parent `app/[locale]/admin/layout.tsx`
// (requires logged-in user with role IN ('ADMIN', 'OWNER')).
//
// Pattern: mirrors `/admin/label` page (Task #47 Phase 3) — same
// localised translations approach, sonner toasts, lucide icons.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FlagList } from '@/components/admin/flags/flag-list';
import { useRunFlagSync, useFlushFlagCache } from '@/hooks/mutations/use-admin-flag-mutations';

type FlagView = 'active' | 'archived';

export default function AdminFlagsPage() {
  const [view, setView] = useState<FlagView>('active');
  const runSync = useRunFlagSync();
  const flushCache = useFlushFlagCache();

  async function handleSync() {
    try {
      const result = await runSync.mutateAsync();
      if (result.ok) {
        toast.success(
          `Sync complete — ${result.flagsSynced} flag${result.flagsSynced === 1 ? '' : 's'} mirrored${result.errors > 0 ? ` (${result.errors} error${result.errors === 1 ? '' : 's'})` : ''}`,
        );
      } else {
        toast.warning(result.message ?? 'Sync did not complete');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    }
  }

  async function handleFlush() {
    if (
      !confirm(
        'Flush the in-process L1 cache on this instance? Reads briefly hit the DB until L1 re-warms.',
      )
    ) {
      return;
    }
    try {
      await flushCache.mutateAsync();
      toast.success('Flag cache flushed on this instance');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Flush failed');
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Feature flags</h1>
            <p className="text-sm text-muted-foreground">
              Manage runtime toggles, rollouts, kill switches, and overrides.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={runSync.isPending}
              aria-label="Force sync from PostHog"
            >
              {runSync.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
              <span className="ml-2">Sync from PostHog</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFlush}
              disabled={flushCache.isPending}
              aria-label="Flush L1 cache"
            >
              <Trash2 className="size-4" aria-hidden />
              <span className="ml-2">Flush cache</span>
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <Tabs value={view} onValueChange={(v) => setView(v as FlagView)} className="w-full">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">
            <FlagList view="active" />
          </TabsContent>
          <TabsContent value="archived" className="mt-4">
            <FlagList view="archived" />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
