// ═══════════════════════════════════════════════════════════════
// CONSISTENT HELP — Task #54 (WCAG 2.2 SC 3.2.6, Level A)
// apps/web/components/a11y/consistent-help.tsx
//
// THE CRITERION (new in WCAG 2.2):
//   If a help mechanism exists, it must appear in the SAME relative
//   order on every page where it appears. The point is muscle
//   memory: a patient who got stuck once should find help in the
//   same place every time — without re-searching the page.
//
// THE DATUN SHAPE:
//   One component, one placement rule — the LAST element of a
//   page-level container (it mounts in (auth)/layout.tsx below the
//   copyright line today; future stuck-prone surfaces reuse it in
//   that same "bottom of the card/page" slot). One destination —
//   the human-support WhatsApp (+91 87960 64170, the WhatsApp
//   Business App number from @repo/shared CONTACTS; NEVER the Meta
//   Cloud API sender). The prefilled text mirrors the homepage CTA
//   pattern (primary-actions.tsx) so support sees consistent intros.
//
// I18N:
//   The visible label REUSES common.homepage.ctaWhatsApp ("Talk to
//   us on WhatsApp"), which already exists in all 10 locales — this
//   component adds ZERO new translation keys. If a dedicated help
//   string is ever wanted, add common.a11y.helpLabel across all 10
//   bundles in one PR (check-translations enforces parity).
//
// SERVER COMPONENT: no state, no handlers — next-intl's
// useTranslations works in RSC (same pattern as (auth)/layout.tsx).
// ═══════════════════════════════════════════════════════════════

import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import { CONTACTS } from '@repo/shared';
import { cn } from '@/lib/utils';

const HELP_URL =
  `https://wa.me/${CONTACTS.supportPhone}?text=` + encodeURIComponent('Hi Datun! I need help: ');

interface ConsistentHelpProps {
  /** Layout spacing from the parent — placement order itself is the
   *  3.2.6 contract and is not configurable. */
  className?: string;
}

export function ConsistentHelp({ className }: ConsistentHelpProps) {
  const t = useTranslations('common');

  return (
    <a
      href={HELP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        // min-h ties into the Phase 1 target-size floor (SC 2.5.8):
        // a help link for stuck users must never be the thing that's
        // hard to tap.
        'inline-flex min-h-6 items-center justify-center gap-1.5',
        'text-xs font-medium text-muted-foreground transition-colors',
        'hover:text-primary focus-visible:text-primary',
        className,
      )}
    >
      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{t('homepage.ctaWhatsApp')}</span>
    </a>
  );
}
