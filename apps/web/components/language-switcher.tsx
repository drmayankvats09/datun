// apps/web/components/language-switcher.tsx
// ═══════════════════════════════════════════════════════════════
// LANGUAGE SWITCHER v5 — native <select>, Phosphor icons, FAANG-grade
//
// WHY NATIVE <select> (restored from v3 after a v4 Popover regression):
//   The a11y contract (e2e/a11y/keyboard-nav.a11y.spec.ts:75) certifies a
//   role="combobox" named "Language" that exposes real <option value="en|hi">.
//   A native <select> satisfies SC 2.1.1 / 2.1.2 / 4.1.2 with zero widget JS —
//   keyboard, focus, Escape, type-ahead and the OS-native mobile picker all come
//   from the browser. The v4 Popover (role="menuitem" buttons) exposed no
//   combobox and no options, so it broke that contract.
//
// ICONS: Phosphor — the ONE icon library (Part 10, no lucide). GlobeSimple +
//   CaretDown are purely decorative (aria-hidden); the <select> carries the
//   accessible name. No flag emojis (Windows renders 🇮🇳/🇬🇧 as raw "IN"/"GB").
// i18n wiring: useLocale + router.replace(pathname, { locale }).
// ═══════════════════════════════════════════════════════════════

'use client';

import type { ChangeEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CaretDown, GlobeSimple } from '@phosphor-icons/react';

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
      {/* Decorative — the <select> carries the accessible name, so both icons
          are hidden from assistive tech. pointer-events-none lets clicks fall
          through to the native control beneath. */}
      <GlobeSimple
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
      <CaretDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-muted-foreground"
      />
    </div>
  );
}
