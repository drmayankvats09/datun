// ═══════════════════════════════════════════════════════════════
// LOCALE FONT — Script-specific Google Font loading
// Tamil, Telugu, Bengali etc. need their own font.
// Loads ONLY current locale's font — not all 10.
// Pattern: Google Noto Sans family.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import { LOCALE_META } from '@/i18n/config';
import type { Locale } from '@/i18n/config';

/** Google Fonts API URLs for Indian scripts */
const FONT_URLS: Partial<Record<string, string>> = {
  'Noto Sans Devanagari':
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap',
  'Noto Sans Tamil':
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap',
  'Noto Sans Telugu':
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap',
  'Noto Sans Bengali':
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap',
  'Noto Sans Gujarati':
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;500;600;700&display=swap',
  'Noto Sans Kannada':
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;500;600;700&display=swap',
  'Noto Sans Malayalam':
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;500;600;700&display=swap',
  'Noto Sans Gurmukhi':
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Gurmukhi:wght@400;500;600;700&display=swap',
};

/**
 * Dynamically loads script-specific font for current locale.
 * English = no extra font (Inter already loaded).
 * Hindi/Marathi = Noto Sans Devanagari.
 * Tamil = Noto Sans Tamil. Etc.
 *
 * Place in locale layout or AppProvider.
 */
export function LocaleFont() {
  const locale = useLocale() as Locale;
  const meta = LOCALE_META[locale];

  useEffect(() => {
    if (!meta?.fontFamily) return;

    const url = FONT_URLS[meta.fontFamily];
    if (!url) return;

    // Check if already loaded
    const existing = document.querySelector(`link[data-locale-font="${locale}"]`);
    if (existing) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.setAttribute('data-locale-font', locale);
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [locale, meta]);

  return null;
}
