// apps/web/hooks/mutations/use-mark-notification-read.ts
// ═══════════════════════════════════════════════════════════════
// useMarkNotificationRead / useMarkAllNotificationsRead — Phase 2
//
// Optimistic flips on the bell-icon dropdown:
//
//   useMarkNotificationRead   → flip ONE notification's readAt
//                                and decrement the unread count
//
//   useMarkAllNotificationsRead → flip ALL items' readAt and zero
//                                  the unread badge
//
// Why optimistic here (unlike book/cancel):
//   - The action is idempotent on the server (POST /read on a
//     already-read item is a no-op).
//   - The user expects the bell badge to drop INSTANTLY when they
//     tap "Mark all as read" — any latency feels broken.
//   - Failure case is benign: a refetch reconciles state.
//
// Snapshot + rollback covers BOTH the list cache (multiple filter
// variants) AND the unread-count cache.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NotificationDTO, PaginatedData } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

interface MarkOneContext {
  readonly previousLists: ReadonlyArray<{
    readonly queryKey: readonly unknown[];
    readonly data: PaginatedData<NotificationDTO> | undefined;
  }>;
  readonly previousCount: { readonly count: number } | undefined;
}

// ─── Mark ONE as read ─────────────────────────────────────

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: true }, Error, { id: string }, MarkOneContext>({
    mutationKey: ['notifications.mark-read'],

    mutationFn: ({ id }) => api.notifications.markRead(id),

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });

      const nowIso = new Date().toISOString();

      // Snapshot every list cache (multiple filter variants may exist).
      const listSnapshots = queryClient.getQueriesData<PaginatedData<NotificationDTO>>({
        queryKey: queryKeys.notifications.lists(),
      });

      const previousLists = listSnapshots.map(([queryKey, data]) => ({
        queryKey,
        data,
      }));

      // Optimistically flip readAt across all list variants.
      for (const { queryKey, data } of previousLists) {
        if (!data) continue;
        queryClient.setQueryData<PaginatedData<NotificationDTO>>(queryKey, {
          ...data,
          items: data.items.map((n) =>
            n.id === id && n.readAt === null ? { ...n, readAt: nowIso } : n,
          ),
        });
      }

      // Decrement unread count.
      const previousCount = queryClient.getQueryData<{ count: number }>(
        queryKeys.notifications.unreadCount(),
      );
      if (previousCount && previousCount.count > 0) {
        queryClient.setQueryData<{ count: number }>(queryKeys.notifications.unreadCount(), {
          count: previousCount.count - 1,
        });
      }

      return { previousLists, previousCount };
    },

    onError: (_err, _vars, context) => {
      if (!context) return;
      for (const { queryKey, data } of context.previousLists) {
        queryClient.setQueryData(queryKey, data);
      }
      if (context.previousCount !== undefined) {
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousCount);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
}

// ─── Mark ALL as read ─────────────────────────────────────

interface MarkAllContext {
  readonly previousLists: ReadonlyArray<{
    readonly queryKey: readonly unknown[];
    readonly data: PaginatedData<NotificationDTO> | undefined;
  }>;
  readonly previousCount: { readonly count: number } | undefined;
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: true; count: number }, Error, void, MarkAllContext>({
    mutationKey: ['notifications.mark-all-read'],

    mutationFn: () => api.notifications.markAllRead(),

    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });

      const nowIso = new Date().toISOString();

      const listSnapshots = queryClient.getQueriesData<PaginatedData<NotificationDTO>>({
        queryKey: queryKeys.notifications.lists(),
      });

      const previousLists = listSnapshots.map(([queryKey, data]) => ({
        queryKey,
        data,
      }));

      for (const { queryKey, data } of previousLists) {
        if (!data) continue;
        queryClient.setQueryData<PaginatedData<NotificationDTO>>(queryKey, {
          ...data,
          items: data.items.map((n) => (n.readAt === null ? { ...n, readAt: nowIso } : n)),
        });
      }

      const previousCount = queryClient.getQueryData<{ count: number }>(
        queryKeys.notifications.unreadCount(),
      );
      queryClient.setQueryData<{ count: number }>(queryKeys.notifications.unreadCount(), {
        count: 0,
      });

      return { previousLists, previousCount };
    },

    onError: (_err, _vars, context) => {
      if (!context) return;
      for (const { queryKey, data } of context.previousLists) {
        queryClient.setQueryData(queryKey, data);
      }
      if (context.previousCount !== undefined) {
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousCount);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
}
