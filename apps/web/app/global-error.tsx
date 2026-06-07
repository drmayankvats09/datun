// apps/web/app/global-error.tsx
// ═══════════════════════════════════════════════════════════════
// GLOBAL ERROR PAGE — Task #52 Phase 3 (UPGRADE)
//
// Next.js's outermost error.tsx. Triggered ONLY when the root layout
// itself throws — every regular route error is caught by the
// segment-level error.tsx files (Phase 3 ships those). Reaching this
// file means the app shell is broken — CSS variables, Tailwind
// context, fonts, i18n: ALL potentially unavailable.
//
// Why use the shared AppError component:
//   - AppError is the ONE component in our codebase explicitly
//     designed for this "shell is dead" scenario. It uses inline
//     styles (no Tailwind), embeds the brand colors as literals
//     (#00A896 etc.), and uses a plain <a> tag (no i18n).
//   - The v1 file inlined all of that. We now delete the inline
//     duplication — a single source of truth for the last-resort UI.
//
// What changed vs v1:
//   - Support email FIXED — was `dr.mayankvats09@gmail.com` (personal
//     Gmail leaking into production); now `hello@datunai.com`. This
//     bug was tracked in the Phase 1 plan and is now resolved.
//   - Sentry capture moved INTO AppError's useEffect — single
//     code path, single test surface.
//   - Reference ID surfaced consistently (digest preferred over
//     Sentry eventId).
//
// Layout shell requirement:
//   Next.js requires global-error.tsx to return a complete
//   <html><body>...</body></html> — that's why we wrap AppError in
//   the html/body here. Inside the body, AppError takes over.
//
// References:
//   - https://nextjs.org/docs/app/api-reference/file-conventions/error#global-error
//   - https://nextjs.org/docs/app/getting-started/error-handling#handling-global-errors
// ═══════════════════════════════════════════════════════════════

'use client';

import { AppError } from '@/components/error';

export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.ReactElement {
  // Build a reference ID — prefer Next.js's digest because it's the
  // ID that ends up in Vercel's logs alongside the underlying
  // exception. AppError falls back to Sentry's lastEventId() if this
  // is null.
  const referenceId = error.digest ?? null;

  return (
    // Next.js requires global-error.tsx to provide its own <html>
    // wrapper — the root layout was the thing that crashed.
    <html lang="en">
      <body>
        <AppError error={error} referenceId={referenceId} reset={reset} />
      </body>
    </html>
  );
}
