// apps/web/components/admin/flags/flag-row.tsx
// ═══════════════════════════════════════════════════════════════
// FlagRow — Single flag entry in the admin table (Task #49)
// ─────────────────────────────────────────────────────────────────
// Renders one flag row with inline edit controls:
//   - Status switch (OFF / ON; rollout-bucket flags show "%n" badge)
//   - Rollout slider (debounced commit at 600ms idle)
//   - Kill switch button (one-click activation with confirm dialog)
//   - Archive / un-archive
//
// Every mutation surfaces a toast on success and a toast on error.
// No optimistic UI — admin operations are infrequent and we prefer
// the server's truth over a perceived-fast UI that may rollback.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { FeatureFlagDTO } from '@repo/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  useUpdateFlag,
  useKillFlag,
  useRestoreFlag,
  useArchiveFlag,
  useUnarchiveFlag,
} from '@/hooks/mutations/use-admin-flag-mutations';

interface FlagRowProps {
  readonly flag: FeatureFlagDTO;
  readonly archived: boolean;
}

const CATEGORY_LABEL: Readonly<Record<string, string>> = {
  RELEASE: 'Release',
  EXPERIMENT: 'Experiment',
  OPERATIONAL: 'Operational',
  PERMISSION: 'Permission',
  KILL_SWITCH: 'Kill switch',
  BETA: 'Beta',
};

const CATEGORY_TONE: Readonly<Record<string, 'default' | 'secondary' | 'destructive' | 'outline'>> =
  {
    RELEASE: 'secondary',
    EXPERIMENT: 'secondary',
    OPERATIONAL: 'outline',
    PERMISSION: 'outline',
    KILL_SWITCH: 'destructive',
    BETA: 'secondary',
  };

const STATUS_LABEL: Readonly<Record<string, string>> = {
  OFF: 'Off',
  ON: 'On',
  ROLLOUT_BUCKET: 'Rollout',
  TARGETED: 'Targeted',
};

export function FlagRow({ flag, archived }: FlagRowProps) {
  // Local mirror of rollout % for snappy slider feel; committed via
  // debounced effect to avoid hammering the PATCH endpoint as the
  // admin drags.
  const [rolloutLocal, setRolloutLocal] = useState(flag.rolloutPercent);
  const lastCommittedRef = useRef(flag.rolloutPercent);
  // Sync when the source flag changes (e.g. another admin updated it).
  useEffect(() => {
    setRolloutLocal(flag.rolloutPercent);
    lastCommittedRef.current = flag.rolloutPercent;
  }, [flag.rolloutPercent]);

  const updateFlag = useUpdateFlag();
  const killFlag = useKillFlag();
  const restoreFlag = useRestoreFlag();
  const archiveFlag = useArchiveFlag();
  const unarchiveFlag = useUnarchiveFlag();

  // Debounced commit for the rollout slider.
  useEffect(() => {
    if (rolloutLocal === lastCommittedRef.current) return;
    const id = window.setTimeout(() => {
      const value = rolloutLocal;
      void (async () => {
        try {
          await updateFlag.mutateAsync({
            key: flag.flagKey,
            payload: { rolloutPercent: value, status: 'ROLLOUT_BUCKET' },
          });
          lastCommittedRef.current = value;
          toast.success(`${flag.name} rollout set to ${value}%`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Rollout update failed');
          setRolloutLocal(lastCommittedRef.current);
        }
      })();
    }, 600);
    return () => window.clearTimeout(id);
  }, [rolloutLocal, flag.flagKey, flag.name, updateFlag]);

  async function handleToggleStatus(checked: boolean) {
    try {
      await updateFlag.mutateAsync({
        key: flag.flagKey,
        payload: { status: checked ? 'ON' : 'OFF' },
      });
      toast.success(`${flag.name} ${checked ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status update failed');
    }
  }

  async function handleKill() {
    const reason = window.prompt(
      `Activate kill switch for "${flag.name}"?\n\nEnter a reason (visible in audit logs):`,
    );
    if (!reason || reason.trim().length === 0) return;
    try {
      await killFlag.mutateAsync({
        key: flag.flagKey,
        payload: { reason: reason.trim() },
      });
      toast.warning(`Kill switch activated: ${flag.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kill switch failed');
    }
  }

  async function handleRestore() {
    if (!confirm(`Deactivate kill switch for "${flag.name}"? Status will return to OFF.`)) return;
    try {
      await restoreFlag.mutateAsync({ key: flag.flagKey });
      toast.success(`${flag.name} restored`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed');
    }
  }

  async function handleArchive() {
    if (!confirm(`Archive "${flag.name}"? It will be removed from runtime evaluation.`)) return;
    try {
      await archiveFlag.mutateAsync({ key: flag.flagKey });
      toast.success(`${flag.name} archived`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  async function handleUnarchive() {
    try {
      await unarchiveFlag.mutateAsync({ key: flag.flagKey });
      toast.success(`${flag.name} restored to active`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Un-archive failed');
    }
  }

  const isKillSwitch = flag.category === 'KILL_SWITCH';
  const isOn = flag.status === 'ON';
  const isRollout = flag.status === 'ROLLOUT_BUCKET';

  return (
    <tr className="hover:bg-muted/30">
      {/* Flag identity */}
      <td className="px-4 py-3 align-top">
        <div className="space-y-0.5">
          <div className="font-medium">{flag.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{flag.flagKey}</div>
        </div>
      </td>

      {/* Category */}
      <td className="px-4 py-3 align-top">
        <Badge variant={CATEGORY_TONE[flag.category] ?? 'secondary'}>
          {CATEGORY_LABEL[flag.category] ?? flag.category}
        </Badge>
      </td>

      {/* Status switch */}
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          <Switch
            checked={isOn}
            onCheckedChange={(c) => void handleToggleStatus(c)}
            disabled={updateFlag.isPending || archived}
            aria-label={`Toggle ${flag.name}`}
          />
          <span className="text-xs text-muted-foreground">
            {STATUS_LABEL[flag.status] ?? flag.status}
          </span>
        </div>
      </td>

      {/* Rollout slider */}
      <td className="px-4 py-3 align-top">
        {isRollout || flag.rolloutPercent > 0 ? (
          <div className="flex items-center gap-3">
            <Slider
              value={[rolloutLocal]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setRolloutLocal(v[0] ?? 0)}
              disabled={archived}
              className="w-32"
              aria-label={`${flag.name} rollout percentage`}
            />
            <span className="w-10 text-right text-xs tabular-nums">{rolloutLocal}%</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 align-top">
        <div className="flex justify-end gap-1">
          {archived ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleUnarchive()}
              disabled={unarchiveFlag.isPending}
              aria-label={`Un-archive ${flag.name}`}
            >
              <ArchiveRestore className="size-4" aria-hidden />
              <span className="ml-1.5 hidden sm:inline">Restore</span>
            </Button>
          ) : (
            <>
              {isKillSwitch && isOn ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleRestore()}
                  disabled={restoreFlag.isPending}
                  aria-label={`Restore ${flag.name}`}
                >
                  <ShieldCheck className="size-4" aria-hidden />
                  <span className="ml-1.5 hidden sm:inline">Restore</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleKill()}
                  disabled={killFlag.isPending}
                  aria-label={`Activate kill switch for ${flag.name}`}
                >
                  <ShieldAlert className="size-4 text-destructive" aria-hidden />
                  <span className="ml-1.5 hidden sm:inline">Kill</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void handleArchive()}
                disabled={archiveFlag.isPending}
                aria-label={`Archive ${flag.name}`}
              >
                <Archive className="size-4" aria-hidden />
                <span className="ml-1.5 hidden sm:inline">Archive</span>
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
