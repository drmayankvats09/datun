// apps/web/app/[locale]/admin/security/error.tsx
// ═══════════════════════════════════════════════════════════════
// ADMIN SECURITY ERROR PAGE — Task #52 Phase 3 (NEW)
//
// Catches render errors inside the security-focused admin subtree:
//   - /admin/security
//   - /admin/security/violations
//
// Why a dedicated boundary for security pages:
//   - The security dashboard surfaces CSP violations, RLS audit
//     logs, and rate-limit events. A crash here is itself a
//     security signal — possibly an exploit trying to break the
//     audit UI to hide tracks. Segment tag `security` lets us
//     prioritise these crashes ahead of normal product bugs.
//   - The security view loads larger data sets (Sentry events,
//     audit logs paginated to 10k entries). Categoriser routes
//     5xx errors here → 'server' with retry — Phase 1 hook's
//     `queryClient.resetQueries` will refetch on the same screen
//     instead of pushing the staff member to /home.
//   - We deliberately ALSO keep the admin layout mounted (nav with
//     "Back to Admin" link) so a staff member doesn't lose context.
//
// References:
//   - https://nextjs.org/docs/app/api-reference/file-conventions/error
//   - OWASP ASVS V7 (Error Handling & Logging)
// ═══════════════════════════════════════════════════════════════

'use client';

import { RouteError } from '@/components/error';

export default function AdminSecurityError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.ReactElement {
  return <RouteError error={error} reset={reset} segment="admin_security" />;
}
