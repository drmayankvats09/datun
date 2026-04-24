// ═══════════════════════════════════════════════════════════════
// I18N REQUEST — Server-side locale + message loading
// Loads correct JSON file per locale per request.
// Lazy loading: only current locale loaded, not all 10.
// Fallback: missing key → English → key name (never crash).
// ═══════════════════════════════════════════════════════════════

import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import type { Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate locale
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  // Load all namespaced messages for this locale
  // Deep merge: locale-specific + English fallback
  const [localeMessages, fallbackMessages] = await Promise.all([
    import(`../messages/${locale}/common.json`).then((m) => m.default).catch(() => ({})),
    locale !== 'en'
      ? import('../messages/en/common.json').then((m) => m.default).catch(() => ({}))
      : Promise.resolve({}),
  ]);

  const [localeAuth, fallbackAuth] = await Promise.all([
    import(`../messages/${locale}/auth.json`).then((m) => m.default).catch(() => ({})),
    locale !== 'en'
      ? import('../messages/en/auth.json').then((m) => m.default).catch(() => ({}))
      : Promise.resolve({}),
  ]);

  const [localeLegal, fallbackLegal] = await Promise.all([
    import(`../messages/${locale}/legal.json`).then((m) => m.default).catch(() => ({})),
    locale !== 'en'
      ? import('../messages/en/legal.json').then((m) => m.default).catch(() => ({}))
      : Promise.resolve({}),
  ]);

  const [localeConsult, fallbackConsult] = await Promise.all([
    import(`../messages/${locale}/consultation.json`).then((m) => m.default).catch(() => ({})),
    locale !== 'en'
      ? import('../messages/en/consultation.json').then((m) => m.default).catch(() => ({}))
      : Promise.resolve({}),
  ]);

  const [localeErrors, fallbackErrors] = await Promise.all([
    import(`../messages/${locale}/errors.json`).then((m) => m.default).catch(() => ({})),
    locale !== 'en'
      ? import('../messages/en/errors.json').then((m) => m.default).catch(() => ({}))
      : Promise.resolve({}),
  ]);

  // Merge: locale-specific overrides English fallback
  const messages = {
    common: { ...fallbackMessages, ...localeMessages },
    auth: { ...fallbackAuth, ...localeAuth },
    legal: { ...fallbackLegal, ...localeLegal },
    consultation: { ...fallbackConsult, ...localeConsult },
    errors: { ...fallbackErrors, ...localeErrors },
  };

  return {
    locale,
    messages,
    timeZone: 'Asia/Kolkata',
    now: new Date(),
  };
});
