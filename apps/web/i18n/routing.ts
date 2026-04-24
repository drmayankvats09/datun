// ═══════════════════════════════════════════════════════════════
// I18N ROUTING — URL-based locale routing config
// /en/login, /hi/login — locale in URL path.
// Pattern: Airbnb, Stripe, Vercel docs.
// ═══════════════════════════════════════════════════════════════

import { defineRouting } from 'next-intl/routing';
import { LOCALES, DEFAULT_LOCALE } from './config';

export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed', // /en/ hidden (default), /hi/ shown
});
