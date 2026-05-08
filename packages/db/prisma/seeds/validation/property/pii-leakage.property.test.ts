import { describe, it } from 'vitest';
import fc from 'fast-check';
import { AnonymizationEngine, detectPiiInValue } from '../../anonymization';

const ITERATIONS = 10_000;
const engine = new AnonymizationEngine('DPDP');

describe('PII leakage property — DPDP', () => {
  it('zero PII leak for any name input on Patient model', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 200 }), (name) => {
        const { anonymized } = engine.anonymizeRecord('Patient', { id: 'p1', name });
        return detectPiiInValue(anonymized.name) === null;
      }),
      { numRuns: ITERATIONS, seed: 42 },
    );
  });

  it('zero PII leak for any phone input', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.stringMatching(/^\+91[6-9]\d{9}$/), fc.string({ minLength: 6, maxLength: 16 })),
        (phone) => {
          const { anonymized } = engine.anonymizeRecord('Patient', { id: 'p1', phone });
          return detectPiiInValue(anonymized.phone) === null;
        },
      ),
      { numRuns: ITERATIONS, seed: 42 },
    );
  });

  it('deterministic: same input → same output (FK preservation)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 4, maxLength: 50 }), (input) => {
        const a = engine.anonymizeRecord('User', { id: 'u1', email: input });
        const b = engine.anonymizeRecord('User', { id: 'u1', email: input });
        return a.anonymized.email === b.anonymized.email;
      }),
      { numRuns: ITERATIONS, seed: 42 },
    );
  });
});
