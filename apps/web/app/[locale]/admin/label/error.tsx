// apps/web/app/[locale]/admin/label/error.tsx
// ═══════════════════════════════════════════════════════════════
// ADMIN LABEL ERROR PAGE — Task #52 Phase 3 (UPGRADE)
//
// Replaces the v1 custom UI (Lucide AlertTriangle icon + 2-button
// row + inline Sentry capture) with the unified <RouteError />.
// Behaviour-equivalent — Sentry capture, retry, home — but now
// shares the design language with every other route error in Datun.
//
// What changed vs v1:
//   - v1 wired Sentry.captureException with a `surface: 'labeling-page'`
//     extra. The shared component does the same plumbing via the
//     `segment` prop (mapped to `route.segment` tag) so the dashboard
//     filter still works — just under a more consistent key.
//   - v1 read translations from `admin.labeling.errors` namespace.
//     The shared component reads from the global `errors` namespace,
//     so this page now uses the unified error copy. Phase 4 will
//     add the localised strings used by RouteError to every locale.
//   - v1 used `window.location.assign('/')` for the home button. The
//     shared component uses i18n-aware `<Link href="/">` which
//     respects locale prefix (e.g. `/hi/`).
//   - Class component / inline icons / bespoke layout — all gone.
//     File shrinks from ~50 lines to ~25 lines.
//
// References:
//   - https://nextjs.org/docs/app/api-reference/file-conventions/error
// ═══════════════════════════════════════════════════════════════

'use client';

import { RouteError } from '@/components/error';

export default function AdminLabelError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.ReactElement {
  return <RouteError error={error} reset={reset} segment="admin_label" />;
}
