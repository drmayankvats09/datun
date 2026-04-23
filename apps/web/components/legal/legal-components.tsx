// ═══════════════════════════════════════════════════════════════
// LEGAL SHARED COMPONENTS — DRY: one place, all pages use.
// Change style here → all 4 legal pages update automatically.
// Pattern: Stripe — shared design system for legal pages.
// ═══════════════════════════════════════════════════════════════

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

/* ── Legal Nav Tabs with Active Highlighting ── */

const LEGAL_PAGES = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/cookies', label: 'Cookie Policy' },
  { href: '/dpdp-notice', label: 'DPDP Notice' },
] as const;

export function LegalNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border/40 border-b">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-6 py-2">
        {LEGAL_PAGES.map((page) => {
          const isActive = pathname === page.href;
          return (
            <Link
              key={page.href}
              href={page.href}
              className={`rounded-md px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {page.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Section — Consistent heading + content wrapper ── */

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-foreground mb-4 text-xl font-bold tracking-tight">{title}</h2>
      <div className="text-foreground/80 space-y-3 text-[0.938rem] leading-relaxed [&_li]:pl-1 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}

/* ── InfoBox — Teal highlight for important callouts ── */

export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-primary/30 bg-primary/5 my-4 rounded-lg border-l-4 p-4 text-sm leading-relaxed">
      {children}
    </div>
  );
}

/* ── WarnBox — Amber warning for medical/legal disclaimers ── */

export function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-lg border-l-4 border-amber-500/30 bg-amber-50 p-4 text-sm leading-relaxed dark:bg-amber-950/20">
      <span className="mr-1">⚠️</span> {children}
    </div>
  );
}

/* ── RightCard — DPDP rights display ── */

export function RightCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-border bg-card my-3 rounded-lg border p-5 transition-shadow hover:shadow-sm">
      <p className="text-foreground mb-1 text-sm font-semibold">
        <span className="mr-2">{icon}</span>
        {title}
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/* ── Legal Page Header — Consistent title area ── */

export function LegalHeader({
  title,
  subtitle,
  lastUpdated,
  contactEmail,
}: {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  contactEmail: string;
}) {
  return (
    <header className="mb-12">
      <p className="text-primary mb-2 text-sm font-semibold tracking-wider uppercase">Legal</p>
      <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="text-muted-foreground mt-1 text-base font-medium">{subtitle}</p>}
      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-2 text-sm">
        <span>Last updated: {lastUpdated}</span>
        <span>&middot;</span>
        <span>Version 2.0</span>
        <span>&middot;</span>
        <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
          {contactEmail}
        </a>
      </div>
      {/* Print/Download button */}
      <button
        onClick={() => window.print()}
        className="text-muted-foreground hover:text-primary hover:border-primary mt-4 inline-flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-medium transition-colors hover:border-current print:hidden"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        Print this page
      </button>
    </header>
  );
}

/* ── Human Summary Box ── */

export function HumanSummary({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-accent/50 border-primary/20 mb-12 rounded-xl border p-6 md:p-8">
      <h2 className="text-foreground mb-4 text-lg font-semibold">Summary — In Plain Language</h2>
      <ul className="text-foreground/80 space-y-2.5 text-sm leading-relaxed">{children}</ul>
    </section>
  );
}

export function SummaryItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-primary mt-0.5 shrink-0">✓</span>
      <span>{children}</span>
    </li>
  );
}
