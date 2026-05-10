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

/**
 * ISO 639-1 (and Prisma LocaleCode enum) -> SeedLocale full names.
 * Bridges the schema's ISO codes with the linguistic layer's descriptive keys.
 * FAANG pattern: be liberal in what you accept (Postel's law).
 */
const LOCALE_ALIASES: Readonly<Record<string, SeedLocale>> = {
  hi: 'hindi',
  en: 'english',
  pa: 'punjabi',
  bn: 'bengali',
  ta: 'tamil',
  te: 'telugu',
  mr: 'marathi',
  gu: 'gujarati',
  hindi: 'hindi',
  english: 'english',
  punjabi: 'punjabi',
  bengali: 'bengali',
  tamil: 'tamil',
  telugu: 'telugu',
  marathi: 'marathi',
  gujarati: 'gujarati',
};

export function resolveLocale(locale: SeedLocale | string): LocaleBundle {
  const normalized = LOCALE_ALIASES[String(locale).toLowerCase()];
  if (!normalized) {
    throw new Error(`Unsupported locale: ${String(locale)}`);
  }
  switch (normalized) {
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
      const _exhaustive: never = normalized;
      throw new Error(`Unsupported normalized locale: ${String(_exhaustive)}`);
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
