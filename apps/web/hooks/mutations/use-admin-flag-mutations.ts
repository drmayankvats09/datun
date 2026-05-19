// apps/web/hooks/mutations/use-admin-flag-mutations.ts
// ═══════════════════════════════════════════════════════════════
// useAdminFlag* — Admin mutations for the flag platform (Task #49)
// ─────────────────────────────────────────────────────────────────
// One file per surface = noise; one file per workflow = the right
// shape here. Every mutation invalidates the same cache key set
// (`queryKeys.flags.all`), so a single helper avoids drift.
//
// Hooks exported:
//   useUpdateFlag        PATCH /api/admin/flags/:key
//   useKillFlag          POST  /api/admin/flags/:key/kill
//   useRestoreFlag       POST  /api/admin/flags/:key/restore
//   useArchiveFlag       POST  /api/admin/flags/:key/archive
//   useUnarchiveFlag     POST  /api/admin/flags/:key/restore-archived
//   useUpsertOverride    POST  /api/admin/flags/:key/overrides
//   useDeleteOverride    DELETE /api/admin/flags/:key/overrides/:id
//   useFlushFlagCache    POST  /api/admin/flags/cache/flush
//   useRunFlagSync       POST  /api/admin/flags/sync/run
//
// No optimistic updates — admin operations are rare and correctness
// trumps perceived speed. The user sees a brief spinner, the row
// re-renders with the server's truth.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  FlagKey,
  UpdateFlagPayload,
  KillSwitchPayload,
  FeatureFlagDTO,
  FeatureFlagOverrideDTO,
  FlagOverrideEntity,
} from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

// ─── Shared invalidation block ───────────────────────────────────

function useFlagInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.flags.all });
  };
}

// ─── Update ──────────────────────────────────────────────────────

export interface UpdateFlagVars {
  readonly key: FlagKey;
  readonly payload: UpdateFlagPayload;
}

export function useUpdateFlag() {
  const invalidate = useFlagInvalidate();
  return useMutation<{ flag: FeatureFlagDTO }, Error, UpdateFlagVars>({
    mutationKey: ['flags.update'],
    mutationFn: ({ key, payload }) => api.adminFlags.update(key, payload),
    onSuccess: invalidate,
  });
}

// ─── Kill switch ────────────────────────────────────────────────

export interface KillFlagVars {
  readonly key: FlagKey;
  readonly payload: KillSwitchPayload;
}

export function useKillFlag() {
  const invalidate = useFlagInvalidate();
  return useMutation<{ flag: FeatureFlagDTO }, Error, KillFlagVars>({
    mutationKey: ['flags.kill'],
    mutationFn: ({ key, payload }) => api.adminFlags.kill(key, payload),
    onSuccess: invalidate,
  });
}

export function useRestoreFlag() {
  const invalidate = useFlagInvalidate();
  return useMutation<{ flag: FeatureFlagDTO }, Error, { key: FlagKey }>({
    mutationKey: ['flags.restore'],
    mutationFn: ({ key }) => api.adminFlags.restore(key),
    onSuccess: invalidate,
  });
}

// ─── Archive / un-archive ────────────────────────────────────────

export function useArchiveFlag() {
  const invalidate = useFlagInvalidate();
  return useMutation<{ flag: FeatureFlagDTO }, Error, { key: FlagKey }>({
    mutationKey: ['flags.archive'],
    mutationFn: ({ key }) => api.adminFlags.archive(key),
    onSuccess: invalidate,
  });
}

export function useUnarchiveFlag() {
  const invalidate = useFlagInvalidate();
  return useMutation<{ flag: FeatureFlagDTO }, Error, { key: FlagKey }>({
    mutationKey: ['flags.unarchive'],
    mutationFn: ({ key }) => api.adminFlags.unarchive(key),
    onSuccess: invalidate,
  });
}

// ─── Overrides ───────────────────────────────────────────────────

export interface UpsertOverrideVars {
  readonly key: FlagKey;
  readonly entityType: FlagOverrideEntity;
  readonly entityId: string;
  readonly value: boolean;
  readonly reason?: string;
  readonly expiresAt?: string;
}

export function useUpsertOverride() {
  const invalidate = useFlagInvalidate();
  return useMutation<{ override: FeatureFlagOverrideDTO }, Error, UpsertOverrideVars>({
    mutationKey: ['flags.override.upsert'],
    mutationFn: ({ key, ...payload }) => api.adminFlags.upsertOverride(key, payload),
    onSuccess: invalidate,
  });
}

export interface DeleteOverrideVars {
  readonly key: FlagKey;
  readonly overrideId: string;
}

export function useDeleteOverride() {
  const invalidate = useFlagInvalidate();
  return useMutation<{ deleted: boolean }, Error, DeleteOverrideVars>({
    mutationKey: ['flags.override.delete'],
    mutationFn: ({ key, overrideId }) => api.adminFlags.deleteOverride(key, overrideId),
    onSuccess: invalidate,
  });
}

// ─── Cache + sync controls ───────────────────────────────────────

export function useFlushFlagCache() {
  const invalidate = useFlagInvalidate();
  return useMutation<{ flushed: true }, Error, void>({
    mutationKey: ['flags.cache.flush'],
    mutationFn: () => api.adminFlags.flushCache(),
    onSuccess: invalidate,
  });
}

export function useRunFlagSync() {
  const invalidate = useFlagInvalidate();
  return useMutation<
    { ok: boolean; flagsSynced: number; errors: number; message?: string },
    Error,
    void
  >({
    mutationKey: ['flags.sync.run'],
    mutationFn: () => api.adminFlags.runSync(),
    onSuccess: invalidate,
  });
}
