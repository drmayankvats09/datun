// apps/web/lib/query/hydrate.tsx
// ═══════════════════════════════════════════════════════════════
// HYDRATE CLIENT — Task #47 Phase 3
//
// Wrapper around TanStack Query's `HydrationBoundary` that streams
// the RSC-prefetched cache to the client tree.
//
// PAIR WITH prefetch.ts:
//
//   // server (RSC)
//   const queryClient = getQueryClient();
//   await prefetchConsultation(queryClient, id);
//   return (
//     <HydrateClient state={dehydrate(queryClient)}>
//       <ConsultationView id={id} />  ← client component
//     </HydrateClient>
//   );
//
//   // client (uses the hydrated cache automatically)
//   function ConsultationView({ id }: { id: string }) {
//     const { data } = useConsultation(id);  // hits cache, NO network
//     return <pre>{JSON.stringify(data, null, 2)}</pre>;
//   }
//
// Why a wrapper instead of using HydrationBoundary directly:
//   - Centralised place to add future cross-cutting concerns
//     (Sentry breadcrumbs for prefetch errors, dev-mode warnings
//      when state is empty, etc.)
//   - Single import surface (`@/lib/query/hydrate`) — consumers
//     don't need to know about TanStack internals.
// ═══════════════════════════════════════════════════════════════

import { HydrationBoundary, type DehydratedState } from '@tanstack/react-query';

export interface HydrateClientProps {
  readonly state: DehydratedState;
  readonly children: React.ReactNode;
}

export function HydrateClient({ state, children }: HydrateClientProps) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
