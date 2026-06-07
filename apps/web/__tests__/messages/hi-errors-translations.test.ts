// apps/web/__tests__/messages/hi-errors-translations.test.ts
// ═══════════════════════════════════════════════════════════════
// HINDI TRANSLATION QUALITY — Task #52 Phase 4
//
// While `errors-completeness.test.ts` verifies that every key EXISTS
// in Hindi, this suite verifies that the values are actually IN HINDI
// (Devanagari script) — not accidentally left as English fallback.
//
// Why a separate test:
//   - The schema-completeness check passes even if a Hindi value is
//     identical to its English counterpart. That's a SILENT i18n
//     regression — the locale ships, no warnings fire, but the user
//     sees English text when they selected Hindi.
//   - A future contributor copy-pasting from `en/errors.json` to
//     `hi/errors.json` and forgetting to translate would slip past
//     the completeness check. This test catches that.
//
// Detection method:
//   - Devanagari Unicode range: U+0900 to U+097F
//   - For each Phase 4 key, verify the Hindi value contains AT LEAST
//     ONE Devanagari character. This is intentionally permissive —
//     interpolations like `{seconds}` and `{feature}` stay Latin,
//     punctuation stays Latin, but at least ONE Devanagari character
//     proves the string is actually translated.
//
// Exceptions:
//   - `feedback.labelEmail` — "ईमेल" (the English loanword 'Email' is
//     also acceptable in modern Hindi UI; we accept either)
//
// Pattern: This is similar to how Notion / Linear's i18n CI checks
// for "lazy translations" — strings that look translated but aren't.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';

import enErrors from '../../messages/en/errors.json';
import hiErrors from '../../messages/hi/errors.json';

// ─── Devanagari detector ───────────────────────────────────────

/**
 * Unicode range for Devanagari script. Matches the script used by
 * Hindi, Marathi, Konkani, Maithili, Nepali, and Sanskrit. For Datun
 * we only test Hindi here — Marathi will need its own suite when
 * Phase 4.5 adds native Marathi translations.
 */
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

/**
 * Check whether a string contains at least one Devanagari character.
 * Returns true for fully-translated strings AND for strings that mix
 * Devanagari with interpolations/punctuation (e.g., "{seconds} सेकंड में…").
 */
function containsDevanagari(value: string): boolean {
  return DEVANAGARI_REGEX.test(value);
}

// ─── Path resolver ─────────────────────────────────────────────

/**
 * Resolve a dotted-path key against an object. Returns undefined if
 * any segment is missing — the completeness test catches that case
 * separately.
 */
function getByPath(obj: Record<string, unknown>, dottedPath: string): unknown {
  let cursor: unknown = obj;
  for (const segment of dottedPath.split('.')) {
    if (typeof cursor !== 'object' || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

// ─── Keys that MUST be translated ──────────────────────────────

/**
 * The subset of Phase 4 keys where a Devanagari translation is
 * mandatory. This excludes keys that are inherently English (proper
 * nouns, technical codes) — currently the empty set, but the array
 * is left here for future use (e.g., if we add a `productName` key
 * we'd let it stay 'Datun').
 */
const KEYS_REQUIRING_TRANSLATION: readonly string[] = [
  // category.* — every title/message
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

  // actions.* — every label
  'actions.retry',
  'actions.retrying',
  'actions.retryingIn',
  'actions.goHome',
  'actions.signInAgain',
  'actions.reload',
  'actions.getHelp',
  'actions.reportBug',
  'actions.contactSupport',

  // recovery.* — every intent label
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

  // feedback.* — every Sentry dialog label
  'feedback.title',
  'feedback.subtitle',
  'feedback.subtitle2',
  'feedback.labelName',
  'feedback.labelComments',
  'feedback.labelClose',
  'feedback.labelSubmit',
  'feedback.errorGeneric',
  'feedback.errorFormEntry',
  'feedback.successMessage',

  // notFound.* (the 404 page)
  'notFound.title',
  'notFound.description',
  'notFound.popular',
  'notFound.destinations.home',
  'notFound.destinations.consult',
  'notFound.destinations.signin',
  'notFound.feedbackPrompt',

  // offline.* (the offline page)
  'offline.badge',
  'offline.title',
  'offline.description',
  'offline.tipWifi',
  'offline.tipAirplane',
  'offline.tipMobile',
  'offline.retryLabel',
];

/**
 * Keys where Hindi may legitimately remain identical to English
 * (English loanwords accepted in modern Hindi UI). Currently:
 *   - `feedback.labelEmail` — "ईमेल" is the Devanagari form, but
 *     leaving as "Email" is acceptable.
 */
const KEYS_ALLOWED_TO_MATCH_ENGLISH: readonly string[] = ['feedback.labelEmail'];

// ─── Tests ─────────────────────────────────────────────────────

describe('hi/errors.json — Hindi translation quality', () => {
  const en = enErrors as Record<string, unknown>;
  const hi = hiErrors as Record<string, unknown>;

  describe('Devanagari script presence', () => {
    it.each(KEYS_REQUIRING_TRANSLATION)('%s contains Devanagari script', (key) => {
      const value = getByPath(hi, key);
      expect(typeof value).toBe('string');
      expect(containsDevanagari(value as string)).toBe(true);
    });
  });

  describe('values diverge from English (no lazy copy-paste)', () => {
    it.each(KEYS_REQUIRING_TRANSLATION)('%s differs from English source', (key) => {
      if (KEYS_ALLOWED_TO_MATCH_ENGLISH.includes(key)) return;

      const enValue = getByPath(en, key);
      const hiValue = getByPath(hi, key);

      expect(typeof enValue).toBe('string');
      expect(typeof hiValue).toBe('string');
      expect(hiValue).not.toBe(enValue);
    });
  });

  describe('interpolation tokens preserved', () => {
    it('category.*.messageWithFeature retains {feature} placeholder', () => {
      const categories = [
        'network',
        'auth',
        'validation',
        'rate-limit',
        'not-found',
        'server',
        'ai-service',
        'consultation-state',
        'chunk-load',
        'unknown',
      ];
      for (const cat of categories) {
        const value = getByPath(hi, `category.${cat}.messageWithFeature`);
        expect(typeof value).toBe('string');
        expect((value as string).includes('{feature}')).toBe(true);
      }
    });

    it('actions.retryingIn retains {seconds} placeholder', () => {
      const value = getByPath(hi, 'actions.retryingIn');
      expect(typeof value).toBe('string');
      expect((value as string).includes('{seconds}')).toBe(true);
    });
  });

  describe('script consistency — no Latin-only values for translated keys', () => {
    it.each(KEYS_REQUIRING_TRANSLATION)(
      '%s is not pure Latin alphabet (Devanagari present)',
      (key) => {
        const value = getByPath(hi, key) as string;
        // Strip interpolation tokens and punctuation before checking.
        // Anything left should contain Devanagari.
        const cleaned = value
          .replace(/\{[^}]+\}/g, '')
          .replace(/[\s\d.,;:!?…—'"()-]/g, '')
          .trim();
        if (cleaned.length === 0) {
          // Edge case — value is entirely an interpolation, e.g. "{seconds}".
          // Currently no such key in our set, but defensive.
          return;
        }
        expect(containsDevanagari(cleaned)).toBe(true);
      },
    );
  });
});
