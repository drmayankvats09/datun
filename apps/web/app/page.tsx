import { BRAND, URLS } from '@repo/shared';
import { ThemeToggle } from '@/components/theme-toggle';
import { PageShell } from '@/components/layout';

export default function HomePage() {
  const websiteLink = URLS.websiteHttps;
  const websiteName = URLS.website;

  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center px-4 sm:px-6">
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <PageShell maxWidth="lg" className="flex flex-col items-center text-center">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {BRAND.name}
          </h1>
          <div className="bg-primary mx-auto mt-3 h-1 w-12 rounded-full" />
        </div>

        <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
          {BRAND.description}
        </p>

        <div className="border-border bg-card mt-8 w-full rounded-xl border px-5 py-4 sm:mt-10 sm:px-6 sm:py-5">
          <p className="text-muted-foreground text-sm font-medium">
            Version 2 is under active development.
          </p>
          <p className="text-muted-foreground/60 mt-1 text-sm">
            {'For the current platform, visit '}
            <a href={websiteLink} className="text-primary font-medium underline underline-offset-4">
              {websiteName}
            </a>
          </p>
        </div>

        <footer className="text-muted-foreground/50 mt-12 text-xs sm:mt-16">
          {BRAND.copyright()}
        </footer>
      </PageShell>
    </main>
  );
}
