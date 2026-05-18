// apps/web/hooks/queries/use-notifications.ts
// ═══════════════════════════════════════════════════════════════
// useNotifications / useUnreadNotificationCount — Task #47 Phase 2
//
//   useNotifications(filters)        → full feed for the dropdown
//   useUnreadNotificationCount()     → red badge on the bell icon,
//                                      polled every 60s
//
// Cache policy:
//   - List staleTime 30s: dropdown opens are episodic, not high-frequency
//   - Count refetchInterval 60s: bell badge needs to be near-real-time
//     without DDOSing the API. WhatsApp / Slack use ~60-90s polling.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { NotificationDTO, NotificationListFilters, PaginatedData } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

const THIRTY_SECONDS_MS = 30_000;
const SIXTY_SECONDS_MS = 60_000;

// ─── List hook ────────────────────────────────────────────

export function useNotifications(filters: NotificationListFilters = {}) {
  return useQuery<PaginatedData<NotificationDTO>>({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: ({ signal }) => api.notifications.list(filters, { signal }),
    staleTime: THIRTY_SECONDS_MS,
    placeholderData: keepPreviousData,
  });
}

// ─── Unread count hook ────────────────────────────────────

export function useUnreadNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: ({ signal }) => api.notifications.unreadCount({ signal }),
    staleTime: SIXTY_SECONDS_MS,
    refetchInterval: SIXTY_SECONDS_MS,
  });
}
