// ═══════════════════════════════════════════════════════════════
// I18N ROUTING — URL-based locale routing config
// /en/login, /hi/login — locale in URL path.
// localeDetection: false — we use custom UI-locale detection
// in proxy.ts (Accept-Language → en|hi only, never regional)
// to avoid users landing on untranslated regional UI.
// ═══════════════════════════════════════════════════════════════

import { defineRouting } from 'next-intl/routing';
import { LOCALES, DEFAULT_LOCALE } from './config';

export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  localeDetection: false, // Custom logic in proxy.ts handles this
});
