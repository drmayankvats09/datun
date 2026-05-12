// ═══════════════════════════════════════════════════════════════
// /admin/label ERROR BOUNDARY — Graceful fallback + Sentry report
// Caught: render errors in admin/label/* subtree.
// NOT caught: errors in server components (handled by global error.tsx)
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function LabelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('admin.labeling.errors');

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { route: '/admin/label', surface: 'labeling-page' },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <AlertTriangle className="mb-4 size-12 text-destructive" aria-hidden="true" />
      <h1 className="mb-2 text-xl font-semibold">{t('loadFailed')}</h1>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        {error.message || 'Something unexpected happened. Our team has been notified.'}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          {t('retry')}
        </Button>
        <Button variant="outline" onClick={() => window.location.assign('/')}>
          Home
        </Button>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-muted-foreground/60">Error ID: {error.digest}</p>
      )}
    </main>
  );
}
