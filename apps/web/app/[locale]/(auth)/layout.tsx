import { BRAND } from '@repo/shared';
import { FormLayout } from '@/components/layout';
import { ConsistentHelp } from '@/components/a11y';
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
        <p className="mt-6 text-center text-xs text-muted-foreground sm:mt-8">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
        {/* Task #54 — SC 3.2.6: help lives in the SAME slot (last
            element of the card) on every auth page. Patients stuck at
            sign-in are exactly who this criterion exists for. */}
        <div className="mt-3 flex justify-center">
          <ConsistentHelp />
        </div>
      </FormLayout>
    </main>
  );
}
