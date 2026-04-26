// ═══════════════════════════════════════════════════════════════
// CONSULTATION LOCALE — Pass user's language to AI backend
// When patient selects Tamil → API gets locale: 'ta'
// → System prompt includes "Respond in Tamil"
// → AI response comes in Tamil
//
// Used by: consultation API call (Task #56+)
// ═══════════════════════════════════════════════════════════════

import { LOCALE_META } from '@/i18n/config';
import type { Locale } from '@/i18n/config';

/**
 * Get AI language instruction for system prompt.
 *
 * @example
 * ```ts
 * const instruction = getAILanguageInstruction('ta');
 * // "Respond in Tamil (தமிழ்). Use simple, conversational Tamil that a patient can understand."
 * ```
 */
export function getAILanguageInstruction(locale: Locale): string {
  const meta = LOCALE_META[locale];
  if (locale === 'en') {
    return 'Respond in English. Use simple, conversational English that any patient can understand.';
  }
  return `Respond in ${meta.name} (${meta.nativeName}). Use simple, conversational ${meta.name} that a patient can understand. For medical terms, use the ${meta.name} term first followed by English in parentheses.`;
}

/**
 * Get locale metadata for API request headers.
 * Backend reads X-Locale header to set AI language.
 */
export function getLocaleHeaders(locale: Locale): Record<string, string> {
  return {
    'X-Locale': locale,
    'X-Language': LOCALE_META[locale].name,
  };
}
