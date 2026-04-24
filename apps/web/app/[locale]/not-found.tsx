import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PageShell } from '@/components/layout';

export default function NotFound() {
  const t = useTranslations('errors');

  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-4 sm:px-6">
      <PageShell maxWidth="md" className="text-center">
        <p className="text-primary text-sm font-semibold">404</p>
        <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          {t('page.notFoundTitle')}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm sm:mt-4 sm:text-base">
          {t('page.notFoundDescription')}
        </p>
        <div className="mt-6 sm:mt-8">
          <Link
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors"
          >
            {t('page.returnHome')}
          </Link>
        </div>
      </PageShell>
    </main>
  );
}
