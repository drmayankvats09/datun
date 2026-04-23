// ═══════════════════════════════════════════════════════════════
// GLOBAL ERROR — Root layout crash (catastrophic, rare)
// Must have its own <html><body> since layout itself crashed.
// ═══════════════════════════════════════════════════════════════

'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
          <p className="mt-2 max-w-sm text-sm text-gray-600">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-lg bg-[#00A896] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00A896]/90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
