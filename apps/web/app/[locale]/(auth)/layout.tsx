import { BRAND } from '@repo/shared';
import { FormLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-6 sm:py-8">
      <FormLayout maxWidth="md">
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            <span className="text-foreground">{BRAND.name.replace(' AI', '')}</span>
            <span className="text-primary"> AI</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('brand.tagline')}</p>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-muted-foreground/50 sm:mt-8">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
      </FormLayout>
    </main>
  );
}
