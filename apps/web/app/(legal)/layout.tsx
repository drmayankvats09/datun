// ═══════════════════════════════════════════════════════════════
// LEGAL LAYOUT — Uses shared components, JSON-LD structured data
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { BRAND, CONTACTS, URLS } from '@repo/shared';
import { LegalNav } from '@/components/legal/legal-components';

const LEGAL_PAGES = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/cookies', label: 'Cookie Policy' },
  { href: '/dpdp-notice', label: 'DPDP Notice' },
] as const;

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* ── Top Navigation ── */}
      <header className="border-border/60 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-xl print:static print:border-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-foreground flex items-center gap-2.5 text-lg font-bold tracking-tight transition-opacity hover:opacity-80"
          >
            <span className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white">
              D
            </span>
            {BRAND.name}
          </Link>
          <Link
            href="/"
            className="text-muted-foreground hover:text-primary rounded-lg border border-transparent px-4 py-2 text-sm font-medium transition-colors hover:border-current print:hidden"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* ── Legal Page Navigation Tabs (with active highlighting) ── */}
      <div className="print:hidden">
        <LegalNav />
      </div>

      {/* ── Page Content ── */}
      <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">{children}</main>

      {/* ── Legal Footer ── */}
      <footer className="border-border/40 border-t print:hidden">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-foreground mb-2 text-sm font-semibold">Legal</p>
              <div className="flex flex-col gap-1.5">
                {LEGAL_PAGES.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    className="text-muted-foreground hover:text-primary text-sm transition-colors"
                  >
                    {page.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-foreground mb-2 text-sm font-semibold">Contact</p>
              <div className="text-muted-foreground flex flex-col gap-1.5 text-sm">
                <a
                  href={`mailto:${CONTACTS.supportEmail}`}
                  className="hover:text-primary transition-colors"
                >
                  {CONTACTS.supportEmail}
                </a>
                <a
                  href={`mailto:${CONTACTS.defaultAlertEmail}`}
                  className="hover:text-primary transition-colors"
                >
                  {CONTACTS.defaultAlertEmail}
                </a>
                <p>{CONTACTS.supportPhoneDisplay}</p>
              </div>
            </div>
            <div>
              <p className="text-foreground mb-2 text-sm font-semibold">Company</p>
              <div className="text-muted-foreground flex flex-col gap-1.5 text-sm">
                <p>{BRAND.legalName}</p>
                <p>New Delhi, India</p>
                <div className="mt-1 flex gap-3">
                  <a
                    href={URLS.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    Instagram
                  </a>
                  <a
                    href={URLS.social.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-border/40 text-muted-foreground/60 mt-8 border-t pt-6 text-center text-xs">
            {BRAND.copyright()}
          </div>
        </div>
      </footer>
    </div>
  );
}
