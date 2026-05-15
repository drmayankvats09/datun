// ═══════════════════════════════════════════════════════════════
// I18N REQUEST — Server-side locale + message loading
// P3-F21: All namespaces loaded in single parallel batch (6x faster)
// P3-F5: Glossary namespace now included
// ═══════════════════════════════════════════════════════════════

import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import type { Locale } from './config';

// P3-F21: Namespace list — add here to auto-load + merge
// P3-F21: Namespace list — add here to auto-load + merge
const NAMESPACES = [
  'common',
  'auth',
  'legal',
  'consultation',
  'errors',
  'glossary',
  'admin',
  // Task #46 — media upload UI + errors
  'media',
] as const;

async function loadNamespace(ns: string, loc: string): Promise<Record<string, unknown>> {
  try {
    const mod = await import(`../messages/${loc}/${ns}.json`);
    return (mod.default as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  // P3-F21: Single parallel batch — all 12 imports at once (6 locale + 6 fallback)
  const promises = NAMESPACES.flatMap((ns) =>
    locale === 'en'
      ? [loadNamespace(ns, 'en'), Promise.resolve({})]
      : [loadNamespace(ns, locale), loadNamespace(ns, 'en')],
  );

  const results = await Promise.all(promises);

  // Merge: locale-specific overrides English fallback
  const messages = NAMESPACES.reduce<Record<string, Record<string, unknown>>>((acc, ns, i) => {
    const localeData = results[i * 2] ?? {};
    const fallbackData = results[i * 2 + 1] ?? {};
    acc[ns] = { ...fallbackData, ...localeData };
    return acc;
  }, {});

  return {
    locale,
    messages,
    timeZone: 'Asia/Kolkata',
    now: new Date(),
  };
});
