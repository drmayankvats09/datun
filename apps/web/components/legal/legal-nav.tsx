'use client';

import { usePathname, Link } from '@/i18n/navigation';

const LEGAL_PAGES = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/cookies', label: 'Cookie Policy' },
  { href: '/dpdp-notice', label: 'DPDP Notice' },
  // Task #54 — public WCAG 2.2 AA statement (EAA Art. 13(2) shape).
  { href: '/accessibility', label: 'Accessibility' },
] as const;

export function LegalNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-border/40">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-6 py-2">
        {LEGAL_PAGES.map((page) => {
          const isActive = pathname === page.href;
          return (
            <Link
              key={page.href}
              href={page.href}
              className={`inline-flex min-h-9 items-center rounded-md px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
