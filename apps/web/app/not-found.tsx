import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="text-center">
        <p className="text-primary text-sm font-semibold">404</p>
        <h1 className="text-dark mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 text-base text-gray-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="bg-primary hover:bg-primary-dark rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
