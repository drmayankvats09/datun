// ═══════════════════════════════════════════════════════════════
// LOCALE PRIMITIVE — Supported language enum
// Used by: every schema with language field, i18n middleware,
//          consultation start, user preferences
//
// 10 languages = 10 locales. This is the SINGLE source of truth.
// apps/web/messages/ folders MUST match this list.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

/**
 * All supported locales — matches apps/web/messages/ directories.
 * Order: English first (default), Hindi second (primary Indian),
 * then regional alphabetically.
 */
export const SUPPORTED_LOCALES = [
  'en', // English (default)
  'hi', // Hindi — हिन्दी
  'bn', // Bengali — বাংলা
  'gu', // Gujarati — ગુજરાતી
  'kn', // Kannada — ಕನ್ನಡ
  'ml', // Malayalam — മലയാളം
  'mr', // Marathi — मराठी
  'pa', // Punjabi — ਪੰਜਾਬੀ
  'ta', // Tamil — தமிழ்
  'te', // Telugu — తెలుగు
] as const;

/** Default locale when none specified */
export const DEFAULT_LOCALE = 'en' as const;

/**
 * Locale field — validated against supported locales.
 * Default: 'en' (English).
 *
 * @example
 * ```ts
 * localeField.parse("hi");       // ✅ "hi"
 * localeField.parse(undefined);  // ✅ "en" (default)
 * localeField.parse("fr");       // ❌ not supported
 * ```
 */
export const localeField = z.enum(SUPPORTED_LOCALES).default(DEFAULT_LOCALE);

/**
 * Optional locale — no default applied.
 * Used in partial updates where undefined means "don't change".
 */
export const optionalLocaleField = z.enum(SUPPORTED_LOCALES).optional();

/** Locale type */
export type Locale = z.infer<typeof localeField>;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
