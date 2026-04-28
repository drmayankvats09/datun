// ═══════════════════════════════════════════════════════════════
// LEGAL SHARED COMPONENTS — DRY: one place, all pages use.
// P4-F10: i18n navigation (locale-aware links)
// P4-F18: window.print() SSR safe
// P4-F26: Translation keys for all hardcoded strings
// ═══════════════════════════════════════════════════════════════

'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

/* ── Legal Nav Tabs with Active Highlighting ── */

const LEGAL_PAGES = [
  { href: '/privacy', labelKey: 'nav.privacy' },
  { href: '/terms', labelKey: 'nav.terms' },
  { href: '/cookies', labelKey: 'nav.cookies' },
  { href: '/dpdp-notice', labelKey: 'nav.dpdp' },
] as const;

export function LegalNav() {
  const pathname = usePathname();
  const t = useTranslations('legal');

  return (
    <nav className="border-b border-border/40">
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
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {t(page.labelKey)}
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
      <h2 className="mb-4 text-xl font-bold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3 text-[0.938rem] leading-relaxed text-foreground/80 [&_li]:pl-1 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}

/* ── InfoBox — Teal highlight for important callouts ── */

export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-lg border-l-4 border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed">
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
    <div className="my-3 rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm">
      <p className="mb-1 text-sm font-semibold text-foreground">
        <span className="mr-2">{icon}</span>
        {title}
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
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
      <p className="mb-2 text-sm font-semibold tracking-wider text-primary uppercase">Legal</p>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1 text-base font-medium text-muted-foreground">{subtitle}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
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
        onClick={() => {
          if (typeof window !== 'undefined') window.print();
        }}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-current hover:border-primary hover:text-primary print:hidden"
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
    <section className="mb-12 rounded-xl border border-primary/20 bg-accent/50 p-6 md:p-8">
      <h2 className="mb-4 text-lg font-semibold text-foreground">Summary — In Plain Language</h2>
      <ul className="space-y-2.5 text-sm leading-relaxed text-foreground/80">{children}</ul>
    </section>
  );
}

export function SummaryItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-0.5 shrink-0 text-primary">✓</span>
      <span>{children}</span>
    </li>
  );
}
