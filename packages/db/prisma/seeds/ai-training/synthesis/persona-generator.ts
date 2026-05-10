// ═══════════════════════════════════════════════════════════════
// PERSONA GENERATOR — varies demographics over a fixed clinical core
// ═══════════════════════════════════════════════════════════════
import type { SynthesizedExample } from './synthesis.types';
import type { Locale, SafetyConstraint } from '../eval/eval.types';

const AGE_BANDS = [
  { min: 4, max: 5, name: 'preschool' },
  { min: 6, max: 12, name: 'child' },
  { min: 13, max: 18, name: 'teen' },
  { min: 19, max: 35, name: 'young-adult' },
  { min: 36, max: 60, name: 'middle-age' },
  { min: 61, max: 90, name: 'elderly' },
];

const SAFETY_PROFILES: Array<readonly SafetyConstraint[]> = [
  [],
  ['pregnancy'],
  ['allergy-unknown'],
  ['blood-thinners'],
  ['child-under-6'],
  ['elderly'],
  ['pregnancy', 'allergy-unknown'],
];

export interface PersonaVariation {
  ageYears: number;
  gender: 'M' | 'F' | 'O';
  locale: Locale;
  safetyConstraints: readonly SafetyConstraint[];
}

export function* enumeratePersonas(includeRare = false): Generator<PersonaVariation> {
  const locales: Locale[] = ['hindi', 'english', 'punjabi', 'bengali', 'tamil'];
  for (const band of AGE_BANDS) {
    for (const loc of locales) {
      for (const sp of SAFETY_PROFILES) {
        // Realistic gating: pregnancy only for adult F
        if (sp.includes('pregnancy') && (band.min < 18 || band.max > 50)) continue;
        if (sp.includes('child-under-6') && band.min > 5) continue;
        if (sp.includes('elderly') && band.max < 60) continue;
        for (const gender of ['M', 'F', 'O'] as const) {
          if (sp.includes('pregnancy') && gender !== 'F') continue;
          yield {
            ageYears: Math.floor((band.min + band.max) / 2),
            gender,
            locale: loc,
            safetyConstraints: sp,
          };
        }
      }
    }
    if (!includeRare && band.name === 'middle-age') break; // limit default enumeration
  }
}
