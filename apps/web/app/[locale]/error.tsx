// apps/web/app/[locale]/error.tsx
// ═══════════════════════════════════════════════════════════════
// LOCALE ROOT ERROR PAGE — Task #52 Phase 3 (UPGRADE)
//
// Replaces the v1 custom error UI with the unified <RouteError />
// component from `@/components/error` (Phase 2). This file is now a
// thin shell — every decision (categorisation, retry strategy, audit,
// Sentry capture, copy resolution) lives in the shared component.
//
// What changed vs v1:
//   - No bespoke layout, no manual Sentry capture, no inline copy.
//   - `segment="locale_root"` is passed so the Sentry dashboard can
//     filter "all errors from the top of the locale tree".
//   - "use client" REMAINS — every Next.js error.tsx MUST be a client
//     component (the framework documents this constraint, since it
//     re-renders with `reset` from the browser).
//
// Position in the route tree:
//   This file catches errors that bubble out of every child segment
//   that doesn't have its OWN error.tsx. Phase 3 wires error.tsx
//   into (auth), (legal), consult, consult/[id], admin, admin/security
//   so this boundary becomes the last-resort net — typically only
//   triggered when a layout itself throws (rare).
//
// What this file is NOT for:
//   - 404 routing — that's `not-found.tsx` (Phase 3 also upgrades it)
//   - Platform crashes — that's `global-error.tsx` (also Phase 3)
//
// References:
//   - https://nextjs.org/docs/app/api-reference/file-conventions/error
//   - https://nextjs.org/docs/app/getting-started/error-handling
// ═══════════════════════════════════════════════════════════════

'use client';

import { RouteError } from '@/components/error';

/**
 * Next.js error.tsx props contract — `error` (with optional digest)
 * and `reset` (re-render the route children). Both come from the
 * framework; we forward them to the shared component.
 */
export default function LocaleRootError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.ReactElement {
  return <RouteError error={error} reset={reset} segment="locale_root" />;
}
