// ═══════════════════════════════════════════════════════════════
// LINGUISTIC LAYER TYPES — 8 Indian languages bundle schema
// Coverage: Hindi, English, Punjabi, Bengali, Tamil, Telugu, Marathi, Gujarati
// ═══════════════════════════════════════════════════════════════

export type SeedLocale =
  | 'hindi'
  | 'english'
  | 'punjabi'
  | 'bengali'
  | 'tamil'
  | 'telugu'
  | 'marathi'
  | 'gujarati';

export interface PainVocabulary {
  readonly throbbing: string;
  readonly sharp: string;
  readonly dull: string;
  readonly burning: string;
  readonly shooting: string;
  readonly constant: string;
  readonly intermittent: string;
}

export interface NameBundle {
  readonly firstNamesMale: readonly string[];
  readonly firstNamesFemale: readonly string[];
  readonly lastNames: readonly string[];
}

export interface LocaleBundle {
  readonly locale: SeedLocale;
  readonly displayName: string;
  readonly displayNameNative: string;
  readonly speakerCountCrore: number;
  readonly names: NameBundle;
  readonly patientOpeners: readonly string[];
  readonly followUpQuestions: readonly string[];
  readonly aiAcknowledgements: readonly string[];
  readonly painVocabulary: PainVocabulary;
}
