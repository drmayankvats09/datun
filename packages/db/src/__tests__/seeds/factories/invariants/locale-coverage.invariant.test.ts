// ═══════════════════════════════════════════════════════════════
// LOCALE COVERAGE INVARIANT
// PROPERTY: Every supported locale yields name + opener + acknowledgement
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { resolveLocale } from '../../../../../prisma/seeds/data/linguistic/locales';

const LOCALES = [
  'hindi',
  'english',
  'punjabi',
  'bengali',
  'tamil',
  'telugu',
  'marathi',
  'gujarati',
] as const;

describe('Locale Coverage Invariants', () => {
  it('every locale provides minimum content set', () => {
    fc.assert(
      fc.property(fc.constantFrom(...LOCALES), (locale) => {
        const bundle = resolveLocale(locale);
        expect(bundle.names.firstNamesMale.length).toBeGreaterThan(5);
        expect(bundle.names.firstNamesFemale.length).toBeGreaterThan(5);
        expect(bundle.names.lastNames.length).toBeGreaterThan(5);
        expect(bundle.patientOpeners.length).toBeGreaterThan(2);
        expect(bundle.aiAcknowledgements.length).toBeGreaterThan(2);
        expect(bundle.followUpQuestions.length).toBeGreaterThan(2);
      }),
      { numRuns: 8 },
    );
  });
});
