import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-6">
      <div className="text-center">
        <p className="text-primary text-sm font-semibold">404</p>
        <h1 className="text-foreground mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="text-muted-foreground mt-4 text-base">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors"
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
