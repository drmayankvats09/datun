import { BRAND } from '@repo/shared';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="text-foreground">{BRAND.name.replace(' AI', '')}</span>
            <span className="text-primary"> AI</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">{BRAND.tagline}</p>
        </div>
        {children}
        <p className="text-muted-foreground/50 mt-8 text-center text-xs">{BRAND.copyright()}</p>
      </div>
    </main>
  );
}
