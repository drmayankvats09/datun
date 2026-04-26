// ═══════════════════════════════════════════════════════════════
// TRANSLATION BANNER — Honest UX for in-progress regional locales
// User on /ta, /te, /bn etc. sees English UI temporarily —
// banner explains: "Translation in progress; AI chat fully native."
// Auto-hides on en/hi (UI_LOCALES). Session-dismissable.
//
// Pattern: Notion's "preview features" banner, GitHub's beta banners.
// Honest > pretending the UI is translated when it isn't.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Languages, X } from 'lucide-react';
import { LOCALE_META, UI_LOCALES } from '@/i18n/config';
import type { Locale } from '@/i18n/config';

const UI_LOCALES_SET = new Set<string>(UI_LOCALES);

export function TranslationBanner() {
  const locale = useLocale() as Locale;
  const [dismissed, setDismissed] = useState(false);

  // Hide on UI-translated locales (en, hi) and after dismiss
  if (UI_LOCALES_SET.has(locale) || dismissed) {
    return null;
  }

  const meta = LOCALE_META[locale];
  if (!meta) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-xs leading-relaxed sm:items-center sm:text-sm">
          <Languages className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" aria-hidden="true" />
          <span>
            We&apos;re translating Datun&apos;s interface into{' '}
            <strong className="font-semibold">{meta.nativeName}</strong>. Currently shown in
            English. Your AI consultation chat works fully in {meta.nativeName}.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="-mr-1 shrink-0 rounded p-1 hover:bg-amber-100 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:hover:bg-amber-900/40"
          aria-label="Dismiss translation notice"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
