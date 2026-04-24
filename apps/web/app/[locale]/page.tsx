import { URLS } from '@repo/shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ThemeToggle } from '@/components/theme-toggle';
import { PageShell } from '@/components/layout';
import { LanguageSwitcher } from '@/components/language-switcher';
import type { Metadata } from 'next';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  return {
    title: t('meta.homeTitle'),
    description: t('meta.homeDescription'),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'common' });

  const websiteLink = URLS.websiteHttps;
  const websiteName = URLS.website;

  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center px-4 sm:px-6">
      <div className="fixed top-4 right-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <PageShell maxWidth="lg" className="flex flex-col items-center text-center">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t('brand.name')}
          </h1>
          <div className="bg-primary mx-auto mt-3 h-1 w-12 rounded-full" />
        </div>

        <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
          {t('brand.description')}
        </p>

        <div className="border-border bg-card mt-8 w-full rounded-xl border px-5 py-4 sm:mt-10 sm:px-6 sm:py-5">
          <p className="text-muted-foreground text-sm font-medium">{t('homepage.devNotice')}</p>
          <p className="text-muted-foreground/60 mt-1 text-sm">
            {t('homepage.visitCurrent', {
              link: websiteName,
            })}{' '}
            <a href={websiteLink} className="text-primary font-medium underline underline-offset-4">
              {websiteName}
            </a>
          </p>
        </div>

        <footer className="text-muted-foreground/50 mt-12 text-xs sm:mt-16">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </footer>
      </PageShell>
    </main>
  );
}
