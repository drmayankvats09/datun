// ═══════════════════════════════════════════════════════════════
// LOCALES RESOLVER — Single entry point for all 8 Indian languages
// Exhaustiveness check ensures any new locale fails compile here.
// ═══════════════════════════════════════════════════════════════

import type { LocaleBundle, SeedLocale } from '../types';
import { HINDI_BUNDLE } from './hindi/bundle';
import { ENGLISH_BUNDLE } from './english/bundle';
import { PUNJABI_BUNDLE } from './punjabi/bundle';
import { BENGALI_BUNDLE } from './bengali/bundle';
import { TAMIL_BUNDLE } from './tamil/bundle';
import { TELUGU_BUNDLE } from './telugu/bundle';
import { MARATHI_BUNDLE } from './marathi/bundle';
import { GUJARATI_BUNDLE } from './gujarati/bundle';

export const ALL_LOCALES: readonly LocaleBundle[] = [
  HINDI_BUNDLE,
  ENGLISH_BUNDLE,
  PUNJABI_BUNDLE,
  BENGALI_BUNDLE,
  TAMIL_BUNDLE,
  TELUGU_BUNDLE,
  MARATHI_BUNDLE,
  GUJARATI_BUNDLE,
] as const;

export function resolveLocale(locale: SeedLocale): LocaleBundle {
  switch (locale) {
    case 'hindi':
      return HINDI_BUNDLE;
    case 'english':
      return ENGLISH_BUNDLE;
    case 'punjabi':
      return PUNJABI_BUNDLE;
    case 'bengali':
      return BENGALI_BUNDLE;
    case 'tamil':
      return TAMIL_BUNDLE;
    case 'telugu':
      return TELUGU_BUNDLE;
    case 'marathi':
      return MARATHI_BUNDLE;
    case 'gujarati':
      return GUJARATI_BUNDLE;
    default: {
      const _exhaustive: never = locale;
      throw new Error(`Unsupported locale: ${String(_exhaustive)}`);
    }
  }
}

/** Pick locale weighted by Indian speaker population */
export function pickLocaleByPopulation(seed: number): SeedLocale {
  const totalSpeakers = ALL_LOCALES.reduce((s, l) => s + l.speakerCountCrore, 0);
  const target = (seed % 1_000_000) * (totalSpeakers / 1_000_000);
  let cumulative = 0;
  for (const bundle of ALL_LOCALES) {
    cumulative += bundle.speakerCountCrore;
    if (cumulative >= target) return bundle.locale;
  }
  return 'hindi';
}

export {
  HINDI_BUNDLE,
  ENGLISH_BUNDLE,
  PUNJABI_BUNDLE,
  BENGALI_BUNDLE,
  TAMIL_BUNDLE,
  TELUGU_BUNDLE,
  MARATHI_BUNDLE,
  GUJARATI_BUNDLE,
};
