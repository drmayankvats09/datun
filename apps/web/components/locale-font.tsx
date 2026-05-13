// apps/web/components/locale-font.tsx
// ═══════════════════════════════════════════════════════════════
// LOCALE FONT — Script-specific Google Font loading with CSP nonce
//
// Loads a Noto Sans variant per locale (Hindi, Tamil, Telugu, etc.) by
// dynamically inserting a <link rel="stylesheet"> into <head>.
//
// CSP integration (Task #45):
//   The injected <link> tag is a "style-src" subject under CSP. Although
//   Google Fonts is in our allowed-origins list, dynamic insertion through
//   JavaScript means CSP also considers the script's authority — having
//   the script run under a nonce-allowed context (or hash-allowed context
//   on static pages) is what authorizes the insertion. We also set the
//   `nonce` attribute on the injected link itself for stricter policies
//   that match link tags against script-src-elem (CSP Level 3 extensions).
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

interface Props {
  /** Per-request CSP nonce (forwarded by layout.tsx). Optional for static routes. */
  nonce?: string;
}

export function LocaleFont({ nonce }: Props) {
  const locale = useLocale() as Locale;
  const meta = LOCALE_META[locale];

  useEffect(() => {
    if (!meta?.fontFamily) return;

    const url = FONT_URLS[meta.fontFamily];
    if (!url) return;

    const existing = document.querySelector(`link[data-locale-font="${locale}"]`);
    if (existing) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.setAttribute('data-locale-font', locale);
    if (nonce) link.setAttribute('nonce', nonce);
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [locale, meta, nonce]);

  return null;
}
