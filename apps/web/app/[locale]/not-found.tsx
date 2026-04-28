import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PageShell } from '@/components/layout';

export default function NotFound() {
  const t = useTranslations('errors');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:px-6">
      <PageShell maxWidth="md" className="text-center">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
          {t('page.notFoundTitle')}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
          {t('page.notFoundDescription')}
        </p>
        <div className="mt-6 sm:mt-8">
          <Link
            href="/"
            className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            {t('page.returnHome')}
          </Link>
        </div>
      </PageShell>
    </main>
  );
}
