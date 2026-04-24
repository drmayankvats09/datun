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
      <div className="bg-destructive/10 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">
        😔
      </div>
      <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
        {t('page.errorTitle')}
      </h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed sm:text-base">
        {t('page.errorDescription')}
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="bg-muted text-destructive mt-4 max-w-lg overflow-auto rounded-lg p-4 text-left text-xs">
          {error.message}
        </pre>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
        >
          {t('page.tryAgain')}
        </button>
        <Link
          href="/"
          className="border-border text-foreground hover:bg-muted rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
        >
          {t('page.goHome')}
        </Link>
      </div>
    </div>
  );
}
