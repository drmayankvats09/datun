import { BRAND, URLS } from '@repo/shared';
import { ThemeToggle } from '@/components/theme-toggle';

export default function HomePage() {
  const websiteLink = URLS.websiteHttps;
  const websiteName = URLS.website;

  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center px-6">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{BRAND.name}</h1>
          <div className="bg-primary mx-auto mt-3 h-1 w-12 rounded-full" />
        </div>

        <p className="text-muted-foreground text-lg leading-relaxed">{BRAND.description}</p>

        <div className="border-border bg-card mt-10 rounded-xl border px-6 py-5">
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

        <footer className="text-muted-foreground/50 mt-16 text-xs">{BRAND.copyright()}</footer>
      </div>
    </main>
  );
}
