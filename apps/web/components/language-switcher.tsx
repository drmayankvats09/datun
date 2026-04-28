// ═══════════════════════════════════════════════════════════════
// LANGUAGE SWITCHER — Globe icon + dropdown
// UI languages: English + Hindi
// Chat languages: 10 (shown in consultation page)
// Pattern: Airbnb, Stripe, Google — globe icon + dropdown.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LOCALE_META, UI_LOCALES } from '@/i18n/config';
import type { Locale } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common.language');

  function handleLocaleChange(newLocale: string) {
    router.replace(pathname, { locale: newLocale as Locale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t('switchLabel')}>
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {UI_LOCALES.map((loc) => {
          const meta = LOCALE_META[loc];
          const isActive = locale === loc;
          return (
            <DropdownMenuItem
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={isActive ? 'bg-primary/10 font-medium text-primary' : ''}
            >
              <span className="mr-2 text-base">{meta.flag}</span>
              <span>{meta.nativeName}</span>
              {isActive && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
