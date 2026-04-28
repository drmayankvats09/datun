'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { errorBoundary: 'page', digest: error.digest ?? 'none' },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center sm:px-6">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-3xl">
        😔
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {t('page.errorTitle')}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t('page.errorDescription')}
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-muted p-4 text-left text-xs text-destructive">
          {error.message}
        </pre>
      )}
      {error.digest && (
        <p className="mt-4 font-mono text-xs text-muted-foreground/70">Error ID: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t('page.tryAgain')}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {t('page.goHome')}
        </Link>
      </div>
    </div>
  );
}
