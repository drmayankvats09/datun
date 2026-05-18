// apps/web/lib/query/prefetch.ts
// ═══════════════════════════════════════════════════════════════
// SERVER-SIDE PREFETCH HELPERS — Task #47 Phase 3
//
// React Server Component (RSC) helpers that warm the QueryClient
// cache BEFORE the page streams to the browser. The result is then
// passed to <HydrateClient> (hydrate.tsx) where client hooks pick
// up the data instantly — no waterfall, first paint <100ms.
//
// Canonical Next.js 16 + TanStack Query v5 pattern. References:
//   https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
//
// USAGE EXAMPLE (RSC page):
//
//   import { dehydrate } from '@tanstack/react-query';
//   import { HydrateClient } from '@/lib/query/hydrate';
//   import { getQueryClient } from '@/lib/query/get-query-client';
//   import { prefetchConsultation } from '@/lib/query/prefetch';
//
//   export default async function Page({ params }) {
//     const { id } = await params;
//     const queryClient = getQueryClient();
//     await prefetchConsultation(queryClient, id);
//     return (
//       <HydrateClient state={dehydrate(queryClient)}>
//         <ConsultationView id={id} />
//       </HydrateClient>
//     );
//   }
//
// CAVEAT — AUTH-GATED ENDPOINTS:
//   The current api-client uses localStorage tokens which DO NOT
//   exist on the server. Prefetching an auth-gated endpoint from a
//   pure RSC will get a 401. Two ways to handle:
//     (a) Only prefetch PUBLIC endpoints from RSCs (e.g. clinic
//         directory, public consultation share links).
//     (b) Pass the access token explicitly via cookies (future
//         Task — once we move tokens from localStorage to httpOnly
//         cookies for full SSR auth).
//
//   For Phase 3, these helpers are scaffolding. Live consumers will
//   wire them per-route as we adopt them.
// ═══════════════════════════════════════════════════════════════

import type { QueryClient } from '@tanstack/react-query';
import { api, authFetch, ENDPOINTS } from '@/lib/api';
import { queryKeys } from './keys';
import type { ConsultationFilters, ClinicFilters, NotificationListFilters } from '@repo/shared';

// ─── Consultations ────────────────────────────────────────

export function prefetchConsultation(client: QueryClient, id: string) {
  return client.prefetchQuery({
    queryKey: queryKeys.consultations.detail(id),
    queryFn: () => api.consultations.detail(id),
  });
}

export function prefetchConsultationList(client: QueryClient, filters: ConsultationFilters = {}) {
  return client.prefetchQuery({
    queryKey: queryKeys.consultations.list(filters),
    queryFn: () => api.consultations.list(filters),
  });
}

// ─── Clinics ──────────────────────────────────────────────

export function prefetchClinic(client: QueryClient, id: string) {
  return client.prefetchQuery({
    queryKey: queryKeys.clinics.detail(id),
    queryFn: () => api.clinics.detail(id),
  });
}

export function prefetchClinicList(client: QueryClient, filters: ClinicFilters = {}) {
  return client.prefetchQuery({
    queryKey: queryKeys.clinics.list(filters),
    queryFn: () => api.clinics.list(filters),
  });
}

// ─── Auth (current user) ──────────────────────────────────

export function prefetchCurrentUser(client: QueryClient) {
  return client.prefetchQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: () => api.auth.me(),
  });
}

// ─── Notifications ────────────────────────────────────────

export function prefetchNotifications(client: QueryClient, filters: NotificationListFilters = {}) {
  return client.prefetchQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: () => api.notifications.list(filters),
  });
}

// ─── Feature flags (public-default safe) ──────────────────

/**
 * Prefetch feature flags. Anonymous (userId=null) is safe to call
 * from any RSC — the backend returns the public default set without
 * needing auth.
 */
export function prefetchFeatureFlags(client: QueryClient, userId: string | null = null) {
  return client.prefetchQuery({
    queryKey: queryKeys.flags.list(userId),
    queryFn: () =>
      authFetch<Record<string, boolean>>(ENDPOINTS.flags.list, {
        method: 'GET',
        skipAuth: !userId,
      }),
  });
}
