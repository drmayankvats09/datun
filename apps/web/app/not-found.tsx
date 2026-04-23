import Link from 'next/link';
import { PageShell } from '@/components/layout';

export default function NotFound() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-4 sm:px-6">
      <PageShell maxWidth="md" className="text-center">
        <p className="text-primary text-sm font-semibold">404</p>
        <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          Page not found
        </h1>
        <p className="text-muted-foreground mt-3 text-sm sm:mt-4 sm:text-base">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6 sm:mt-8">
          <Link
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors"
          >
            Return home
          </Link>
        </div>
      </PageShell>
    </main>
  );
}
