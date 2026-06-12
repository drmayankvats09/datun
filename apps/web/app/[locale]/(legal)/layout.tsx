// ═══════════════════════════════════════════════════════════════
// LEGAL LAYOUT — Uses shared components, JSON-LD structured data
// ═══════════════════════════════════════════════════════════════

import { Link } from '@/i18n/navigation';
import { BRAND, CONTACTS, URLS } from '@repo/shared';
import { LegalNav } from '@/components/legal/legal-nav';

const LEGAL_PAGES = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/cookies', label: 'Cookie Policy' },
  { href: '/dpdp-notice', label: 'DPDP Notice' },
  // Task #54 — public WCAG 2.2 AA statement (EAA Art. 13(2) shape).
  { href: '/accessibility', label: 'Accessibility' },
] as const;

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    // Task #54 audit fix — SC 3.1.2 (Language of Parts): legal content
    // is professional English on EVERY locale's URL (/hi/privacy serves
    // English under html[lang="hi"]). Without this, NVDA/TalkBack read
    // English text with a Hindi/Tamil pronunciation engine — word soup.
    // lang="en" on the legal subtree corrects the engine for all five
    // pages (privacy/terms/cookies/dpdp/accessibility) in one place.
    // html[lang] stays the locale — correct for the URL's chrome.
    <div lang="en" className="min-h-screen bg-background text-foreground">
      {/* ── Top Navigation ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl print:static print:border-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              D
            </span>
            {BRAND.name}
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-current hover:text-primary print:hidden"
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
      <footer className="border-t border-border/40 print:hidden">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Legal</p>
              <div className="flex flex-col gap-1.5">
                {LEGAL_PAGES.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    className="inline-flex min-h-6 w-fit items-center text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {page.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Contact</p>
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                <a
                  href={`mailto:${CONTACTS.supportEmail}`}
                  className="inline-flex min-h-6 w-fit items-center transition-colors hover:text-primary"
                >
                  {CONTACTS.supportEmail}
                </a>
                <a
                  href={`mailto:${CONTACTS.defaultAlertEmail}`}
                  className="inline-flex min-h-6 w-fit items-center transition-colors hover:text-primary"
                >
                  {CONTACTS.defaultAlertEmail}
                </a>
                <p>{CONTACTS.supportPhoneDisplay}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Company</p>
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                <p>{BRAND.legalName}</p>
                <p>New Delhi, India</p>
                <div className="mt-1 flex gap-3">
                  <a
                    href={URLS.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-6 items-center transition-colors hover:text-primary"
                  >
                    Instagram
                  </a>
                  <a
                    href={URLS.social.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-6 items-center transition-colors hover:text-primary"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
            {BRAND.copyright()}
          </div>
        </div>
      </footer>
    </div>
  );
}
