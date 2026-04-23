// ═══════════════════════════════════════════════════════════════
// ERROR — Page-level error boundary (common, user-recoverable)
// Runs INSIDE layout so Tailwind, theme, nav all work.
// Reports to Sentry automatically.
// ═══════════════════════════════════════════════════════════════

'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        errorBoundary: 'page',
        digest: error.digest ?? 'none',
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center sm:px-6">
      <div className="bg-destructive/10 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">
        😔
      </div>
      <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
        Something went wrong
      </h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed sm:text-base">
        An unexpected error occurred. Our team has been automatically notified.
      </p>

      {process.env.NODE_ENV === 'development' && (
        <pre className="bg-muted text-destructive mt-4 max-w-lg overflow-auto rounded-lg p-4 text-left text-xs">
          {error.message}
          {error.digest && `\nDigest: ${error.digest}`}
        </pre>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border-border text-foreground hover:bg-muted rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
