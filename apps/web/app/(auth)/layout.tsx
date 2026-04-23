import { BRAND } from '@repo/shared';
import { FormLayout } from '@/components/layout';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-4 py-6 sm:py-8">
      <FormLayout maxWidth="md">
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            <span className="text-foreground">{BRAND.name.replace(' AI', '')}</span>
            <span className="text-primary"> AI</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">{BRAND.tagline}</p>
        </div>
        {children}
        <p className="text-muted-foreground/50 mt-6 text-center text-xs sm:mt-8">
          {BRAND.copyright()}
        </p>
      </FormLayout>
    </main>
  );
}
