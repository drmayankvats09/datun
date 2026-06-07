// apps/web/app/[locale]/(auth)/error.tsx
// ═══════════════════════════════════════════════════════════════
// AUTH ROUTE GROUP ERROR PAGE — Task #52 Phase 3 (NEW)
//
// Catches render errors inside the `(auth)` route group:
//   - /login
//   - /signup
//   - /forgot-password
//   - /reset-password
//
// Why a dedicated boundary for the auth segment:
//   - Auth flows are funnel-critical — a crash here costs a sign-up.
//     A segment-level boundary keeps the auth layout (logo, language
//     switcher, theme toggle) mounted while showing the recovery UI,
//     so the user has a clear escape hatch back to /login.
//   - Sentry filter "segment=auth" + "category=auth" tells us when an
//     auth bug is amplifying itself (e.g., the login page crashes on
//     a 401-redirect loop) — fast triage signal for revenue paths.
//   - The categoriser's `auth` branch will show "Sign in again" as the
//     primary CTA. Inside the auth flow that becomes a no-op loop
//     (user IS at /login). The segment tag lets us tweak this in
//     Phase 5 if needed without re-categorising globally.
//
// References:
//   - https://nextjs.org/docs/app/api-reference/file-conventions/error
//   - Auth funnel best practice: keep recovery affordances visible
// ═══════════════════════════════════════════════════════════════

'use client';

import { RouteError } from '@/components/error';

export default function AuthError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.ReactElement {
  return <RouteError error={error} reset={reset} segment="auth" />;
}
