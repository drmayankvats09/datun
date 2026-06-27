// apps/web/components/language-switcher.tsx
// ═══════════════════════════════════════════════════════════════
// LANGUAGE SWITCHER v4 — @repo/ui Popover + Phosphor icons (Task #55).
//
// A premium globe trigger that opens an accessible menu listing each language in
// its OWN native script, with a checkmark on the active locale. Built on the
// @repo/ui <Popover>/<MenuItem> primitive (native HTML Popover API): the browser
// gives top-layer rendering, light-dismiss (click-outside), Escape, and focus
// for free; each item is a real <button role="menuitem"> (>=44px target, visible
// focus ring) so the control stays fully keyboard + screen-reader operable.
//
// Icons are Phosphor via the @repo/ui <Icon> primitive (Part 10, the ONE icon
// library — no lucide). The trigger carries the accessible name; icons are
// decorative. No flag emojis (they render inconsistently per OS).
// i18n wiring preserved: useLocale + router.replace(pathname,{locale}).
// ═══════════════════════════════════════════════════════════════

'use client';

import type { MouseEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Icon, MenuItem, Popover } from '@repo/ui';
import { CaretDown, Check, GlobeSimple } from '@phosphor-icons/react';

import { useRouter, usePathname } from '@/i18n/navigation';
import { LOCALE_META, UI_LOCALES } from '@/i18n/config';
import type { Locale } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common.language');

  function pick(loc: Locale, event: MouseEvent<HTMLButtonElement>) {
    // Close the native popover, then navigate (light-dismiss also handles Esc).
    (event.currentTarget.closest('[popover]') as HTMLElement | null)?.hidePopover?.();
    if (loc !== locale) router.replace(pathname, { locale: loc });
  }

  return (
    <Popover
      align="start"
      trigger={
        <button
          type="button"
          aria-label={t('switchLabel')}
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border border-border/60 bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Icon as={GlobeSimple} size="xs" className="text-muted-foreground" />
          <span>{LOCALE_META[locale].nativeName}</span>
          <Icon as={CaretDown} size="xs" className="text-muted-foreground" />
        </button>
      }
    >
      {UI_LOCALES.map((loc) => (
        <MenuItem
          key={loc}
          onClick={(event) => pick(loc, event)}
          aria-current={loc === locale ? 'true' : undefined}
          icon={
            loc === locale ? (
              <Icon as={Check} size="sm" />
            ) : (
              <span className="inline-block h-5 w-5" />
            )
          }
        >
          {LOCALE_META[loc].nativeName}
        </MenuItem>
      ))}
    </Popover>
  );
}
