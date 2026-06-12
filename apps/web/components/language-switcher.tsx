// apps/web/components/language-switcher.tsx
// ═══════════════════════════════════════════════════════════════
// LANGUAGE SWITCHER v3 — native <select>, flag-free, FAANG-grade
//
// REDESIGN RATIONALE (Task #54, r7):
//   v2 shipped flag emojis in each option. On Windows, 🇮🇳 / 🇬🇧 do
//   NOT render as flags — the OS shows the raw regional-indicator
//   letters "IN" / "GB", which collided with the globe icon and
//   visibly overlapped the language name (reported desktop + mobile).
//
//   Fix = the pattern the most-audited locale pickers use (GOV.UK,
//   Apple/Google footers, W3C): a styled NATIVE <select> showing the
//   language in its OWN script — "English", "हिन्दी" — with ONE globe
//   affordance on the left and a chevron on the right. No emojis, so
//   nothing renders differently per-OS; generous padding (pl-9 / pr-9)
//   guarantees the icons never touch the text.
//
//   Why native <select> overall:
//   - Keyboard + focus + Escape + type-ahead are the browser's own
//     (SC 2.1.1 / 2.1.2 / 4.1.2 satisfied with zero widget JS).
//   - Mobile gets the OS-native picker — better touch UX than a popover.
//   - Opaque bg-card surface: translucent over <AuroraBg /> has an
//     unverifiable blend, so token surfaces only (≥4.5:1 both themes).
// ═══════════════════════════════════════════════════════════════

'use client';

import type { ChangeEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, Globe } from 'lucide-react';

import { useRouter, usePathname } from '@/i18n/navigation';
import { LOCALE_META, UI_LOCALES } from '@/i18n/config';
import type { Locale } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common.language');

  function handleLocaleChange(event: ChangeEvent<HTMLSelectElement>) {
    router.replace(pathname, { locale: event.target.value as Locale });
  }

  return (
    <div className="relative inline-flex items-center">
      {/* Decorative — the <select> carries the accessible name, so both
          icons are hidden from assistive tech. pointer-events-none lets
          clicks fall through to the native control beneath. */}
      <Globe
        aria-hidden="true"
        className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
      />
      <select
        value={locale}
        onChange={handleLocaleChange}
        aria-label={t('switchLabel')}
        className="h-9 cursor-pointer appearance-none rounded-full border border-border/60 bg-card pr-9 pl-9 text-sm font-medium text-foreground transition-colors hover:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {UI_LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_META[loc].nativeName}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-muted-foreground"
      />
    </div>
  );
}
