// ═══════════════════════════════════════════════════════════════
// I18N CONFIG — Supported locales, default, metadata
// 10 Indian languages. Architecture supports 50+ languages.
// Add new language: 1) add to LOCALES 2) add messages/xx/ folder
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_LOCALE = 'en' as const;

export const LOCALES = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa'] as const;

export type Locale = (typeof LOCALES)[number];

/** Human-readable locale metadata — flags, names, scripts */
export const LOCALE_META: Record<
  Locale,
  {
    name: string;
    nativeName: string;
    flag: string;
    script: string;
    dir: 'ltr' | 'rtl';
    fontFamily?: string;
  }
> = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧', script: 'Latin', dir: 'ltr' },
  hi: {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    script: 'Devanagari',
    dir: 'ltr',
    fontFamily: 'Noto Sans Devanagari',
  },
  ta: {
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    script: 'Tamil',
    dir: 'ltr',
    fontFamily: 'Noto Sans Tamil',
  },
  te: {
    name: 'Telugu',
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    script: 'Telugu',
    dir: 'ltr',
    fontFamily: 'Noto Sans Telugu',
  },
  bn: {
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇮🇳',
    script: 'Bengali',
    dir: 'ltr',
    fontFamily: 'Noto Sans Bengali',
  },
  mr: {
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    script: 'Devanagari',
    dir: 'ltr',
    fontFamily: 'Noto Sans Devanagari',
  },
  gu: {
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳',
    script: 'Gujarati',
    dir: 'ltr',
    fontFamily: 'Noto Sans Gujarati',
  },
  kn: {
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    script: 'Kannada',
    dir: 'ltr',
    fontFamily: 'Noto Sans Kannada',
  },
  ml: {
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    flag: '🇮🇳',
    script: 'Malayalam',
    dir: 'ltr',
    fontFamily: 'Noto Sans Malayalam',
  },
  pa: {
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    flag: '🇮🇳',
    script: 'Gurmukhi',
    dir: 'ltr',
    fontFamily: 'Noto Sans Gurmukhi',
  },
};

/** Chat-supported languages (AI can respond in these) */
export const CHAT_LOCALES = LOCALES;

/** UI-translated languages (buttons, labels) */
export const UI_LOCALES = ['en', 'hi'] as const;
