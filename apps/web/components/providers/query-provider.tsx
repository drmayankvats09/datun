// apps/web/components/providers/query-provider.tsx
// ═══════════════════════════════════════════════════════════════
// QUERY PROVIDER — Task #47 Phase 1
//
// Client-side React tree wrapper for TanStack Query. Mounted by the
// locale layout in Phase 3 — for Phase 1 this file exists but is
// not yet rendered, so it has ZERO impact on the running app.
//
// Notes on design:
//   - We deliberately AVOID `useState(() => makeQueryClient())`.
//     TanStack docs warn: if React suspends below this component
//     without a Suspense boundary in between, useState's lazy init
//     re-fires and the client is recreated, losing the cache.
//     `getQueryClient()` (which holds its own browser singleton)
//     dodges that footgun cleanly.
//   - Devtools mount ONLY in `development`. The package is in
//     devDependencies so production bundles never pull it in.
//   - Button position `bottom-left` keeps the floating launcher
//     clear of our `ViewportIndicator` (bottom-right, dev-only too).
//
// Mount order (Phase 3 wires this — kept here as the canonical
// reference for the team):
//
//   <ThemeProvider>            ← class on <html>, must be outermost
//     <QueryProvider>          ← provides cache to every consumer
//       <NextIntlClientProvider>
//         <AppProvider>        ← uses queries (route tracker, auth sync)
//           {children}
//         </AppProvider>
//       </NextIntlClientProvider>
//     </QueryProvider>
//   </ThemeProvider>
// ═══════════════════════════════════════════════════════════════

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/query/get-query-client';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
