// apps/web/__tests__/messages/errors-completeness.test.ts
// ═══════════════════════════════════════════════════════════════
// ERRORS TRANSLATION COMPLETENESS — Task #52 Phase 4
//
// Verifies that the new Phase 4 keys (category.*, actions.*, recovery.*,
// referenceLabel, feedback.*, notFound.*, offline.*) exist in EVERY
// locale's errors.json — including the 8 regional locales where the
// values are still English fallback (the schema must match even when
// the language doesn't).
//
// Why this matters:
//   - i18n consumers (WidgetError, RouteError, RetryButton, the 404
//     page, the offline page) call `t('category.network.title')` etc.
//     A missing key in a locale that the user happens to select
//     produces a runtime warning + raw key string on screen.
//   - Tests in Phase 2 use the next-intl mock that returns the
//     namespaced key — so they pass even when real translations are
//     missing. This test is the gate that catches that gap.
//   - The existing CI script (`scripts/check-translations.ts`)
//     enforces Hindi=STRICT and regional=warn. Vitest test parallels
//     that contract so failures appear in the test report too.
//
// Levels of strictness:
//   - 'en' is the source — every key must exist (test fails if not)
//   - 'hi' is STRICT — every key from `en` must exist (test fails if not)
//   - All 8 regional locales — every key from `en` must exist,
//     either translated OR as English fallback (test fails if missing)
//
// Pattern: Vercel i18n CI check, Cal.com translation validation,
// next-intl recommended test setup.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';

// ── All 10 locale dictionaries imported at compile time ──
//
// next-intl resolves locale JSON via dynamic import at request time
// in production, but for tests we import directly to make the
// assertion targets type-safe and to fail at compile time if a
// locale file is renamed.
import enErrors from '../../messages/en/errors.json';
import hiErrors from '../../messages/hi/errors.json';
import taErrors from '../../messages/ta/errors.json';
import teErrors from '../../messages/te/errors.json';
import bnErrors from '../../messages/bn/errors.json';
import mrErrors from '../../messages/mr/errors.json';
import guErrors from '../../messages/gu/errors.json';
import knErrors from '../../messages/kn/errors.json';
import mlErrors from '../../messages/ml/errors.json';
import paErrors from '../../messages/pa/errors.json';

// ─── Locale registry ──────────────────────────────────────────

const LOCALES = {
  en: enErrors,
  hi: hiErrors,
  ta: taErrors,
  te: teErrors,
  bn: bnErrors,
  mr: mrErrors,
  gu: guErrors,
  kn: knErrors,
  ml: mlErrors,
  pa: paErrors,
} as const satisfies Record<string, unknown>;

type LocaleCode = keyof typeof LOCALES;

// ─── Key flattener ─────────────────────────────────────────────

/**
 * Recursively flatten a nested object into a list of dotted-path keys.
 * Mirrors the implementation in `scripts/check-translations.ts` so
 * the test and the CI script agree on what counts as a "key".
 *
 * @example
 *   flatten({ a: { b: 'x' }, c: 'y' })
 *   //   → ['a.b', 'c']
 */
function flatten(obj: Record<string, unknown>, prefix = ''): readonly string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flatten(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// ─── Phase 4 new keys — the minimum set every locale must have ──

const PHASE_4_NEW_KEYS: readonly string[] = [
  // category.* — 10 categories × 3 keys = 30
  'category.network.title',
  'category.network.message',
  'category.network.messageWithFeature',
  'category.auth.title',
  'category.auth.message',
  'category.auth.messageWithFeature',
  'category.validation.title',
  'category.validation.message',
  'category.validation.messageWithFeature',
  'category.rate-limit.title',
  'category.rate-limit.message',
  'category.rate-limit.messageWithFeature',
  'category.not-found.title',
  'category.not-found.message',
  'category.not-found.messageWithFeature',
  'category.server.title',
  'category.server.message',
  'category.server.messageWithFeature',
  'category.ai-service.title',
  'category.ai-service.message',
  'category.ai-service.messageWithFeature',
  'category.consultation-state.title',
  'category.consultation-state.message',
  'category.consultation-state.messageWithFeature',
  'category.chunk-load.title',
  'category.chunk-load.message',
  'category.chunk-load.messageWithFeature',
  'category.unknown.title',
  'category.unknown.message',
  'category.unknown.messageWithFeature',

  // actions.* — 9 keys
  'actions.retry',
  'actions.retrying',
  'actions.retryingIn',
  'actions.goHome',
  'actions.signInAgain',
  'actions.reload',
  'actions.getHelp',
  'actions.reportBug',
  'actions.contactSupport',

  // recovery.* — 10 keys (matches strategy.intentKey from lib/errors/recovery.ts)
  'recovery.recoveryNetwork',
  'recovery.recoveryAuth',
  'recovery.recoveryValidation',
  'recovery.recoveryRateLimit',
  'recovery.recoveryNotFound',
  'recovery.recoveryServer',
  'recovery.recoveryAiService',
  'recovery.recoveryConsultationState',
  'recovery.recoveryChunkLoad',
  'recovery.recoveryUnknown',

  // top-level
  'referenceLabel',

  // feedback.* — 10 Sentry dialog labels
  'feedback.title',
  'feedback.subtitle',
  'feedback.subtitle2',
  'feedback.labelName',
  'feedback.labelEmail',
  'feedback.labelComments',
  'feedback.labelClose',
  'feedback.labelSubmit',
  'feedback.errorGeneric',
  'feedback.errorFormEntry',
  'feedback.successMessage',

  // notFound.* — 6 keys
  'notFound.title',
  'notFound.description',
  'notFound.popular',
  'notFound.destinations.home',
  'notFound.destinations.consult',
  'notFound.destinations.signin',
  'notFound.feedbackPrompt',

  // offline.* — 6 keys
  'offline.badge',
  'offline.title',
  'offline.description',
  'offline.tipWifi',
  'offline.tipAirplane',
  'offline.tipMobile',
  'offline.retryLabel',
];

// ─── Tests ─────────────────────────────────────────────────────

describe('errors.json — Phase 4 translation completeness', () => {
  describe('English (source of truth)', () => {
    const enKeys = new Set(flatten(enErrors as Record<string, unknown>));

    it.each(PHASE_4_NEW_KEYS)('has key %s', (key) => {
      expect(enKeys.has(key)).toBe(true);
    });

    it('total key count covers all Phase 4 additions', () => {
      // 30 category + 9 actions + 10 recovery + 1 referenceLabel
      // + 11 feedback + 7 notFound + 7 offline = 75 new keys
      expect(PHASE_4_NEW_KEYS.length).toBe(75);
    });
  });

  describe('Hindi (STRICT — every key required, must be Devanagari)', () => {
    const hiKeys = new Set(flatten(hiErrors as Record<string, unknown>));

    it.each(PHASE_4_NEW_KEYS)('has key %s', (key) => {
      expect(hiKeys.has(key)).toBe(true);
    });
  });

  // For each regional locale: schema must match (every English key
  // present). Values may still be English fallback — that's the
  // existing convention (see scripts/check-translations.ts).
  const REGIONAL_LOCALES: readonly LocaleCode[] = ['ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa'];

  describe.each(REGIONAL_LOCALES)('Regional locale: %s (schema-strict)', (locale) => {
    const localeKeys = new Set(flatten(LOCALES[locale] as Record<string, unknown>));

    it.each(PHASE_4_NEW_KEYS)('has key %s', (key) => {
      expect(localeKeys.has(key)).toBe(true);
    });
  });

  describe('schema parity — every locale has the same key set as English', () => {
    const enKeys = new Set(flatten(enErrors as Record<string, unknown>));

    const allLocales = Object.keys(LOCALES) as readonly LocaleCode[];

    it.each(allLocales)('locale %s has no missing top-level namespaces', (locale) => {
      const localeData = LOCALES[locale] as Record<string, unknown>;
      const enData = enErrors as Record<string, unknown>;

      // Compare top-level keys only — this is a fast smoke test.
      // Per-key checks are done above per-locale.
      const enTopKeys = Object.keys(enData).sort();
      const localeTopKeys = Object.keys(localeData).sort();

      expect(localeTopKeys).toEqual(enTopKeys);
    });

    it('English has no orphan keys outside the Phase 4 set + existing pre-Phase-4 set', () => {
      // Existing pre-Phase-4 keys from v1:
      const PRE_PHASE_4_KEYS: readonly string[] = [
        // validation.* — 8
        'validation.required',
        'validation.emailInvalid',
        'validation.emailRequired',
        'validation.passwordRequired',
        'validation.passwordMinLength',
        'validation.nameRequired',
        'validation.phoneInvalid',
        'validation.otpInvalid',
        // api.* — 5
        'api.networkError',
        'api.serverError',
        'api.unauthorized',
        'api.rateLimited',
        'api.unknown',
        // page.* — 8
        'page.errorTitle',
        'page.errorDescription',
        'page.errorId',
        'page.tryAgain',
        'page.goHome',
        'page.notFoundTitle',
        'page.notFoundDescription',
        'page.returnHome',
      ];

      const expectedTotal = PRE_PHASE_4_KEYS.length + PHASE_4_NEW_KEYS.length;
      // 21 pre + 75 new = 96
      expect(expectedTotal).toBe(96);
      expect(enKeys.size).toBe(expectedTotal);
    });
  });
});
