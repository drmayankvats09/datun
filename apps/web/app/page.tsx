export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-lg text-center">
        <div className="mb-8">
          <h1 className="text-dark text-4xl font-bold tracking-tight sm:text-5xl">Datun</h1>
          <div className="bg-primary mx-auto mt-3 h-1 w-12 rounded-full" />
        </div>

        <p className="text-lg leading-relaxed text-gray-600">
          AI-powered healthcare platform for India, beginning with dental care.
        </p>

        <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 px-6 py-5">
          <p className="text-sm font-medium text-gray-500">
            Version 2 is under active development.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            For the current platform, visit{' '}
            <a
              href="https://datunai.com"
              className="text-primary font-medium underline underline-offset-4"
            >
              datunai.com
            </a>
          </p>
        </div>

        <footer className="mt-16 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Datun Health Private Limited
        </footer>
      </div>
    </main>
  );
}
