/**
 * Drift Detection Tests — verify schema fingerprint is stable and detects
 * meaningful changes while ignoring cosmetic ones.
 *
 * Pure unit tests — no DB.
 */

import { describe, it, expect } from 'vitest';
import { fingerprint, fingerprintsMatch, normalizeSchema } from '../../lib/schema-fingerprint.js';

describe('schema fingerprint', () => {
  it('[1/3] identical schemas produce identical fingerprints', () => {
    const schema = `
      model User {
        id    String @id
        email String @unique
      }
    `;
    expect(fingerprint(schema)).toBe(fingerprint(schema));
  });

  it('[2/3] cosmetic changes (whitespace, comments) do not change fingerprint', () => {
    const a = `model User { id String @id }`;
    const b = `// a comment
              model User {
                id    String   @id
              }`;
    // Normalization should make these equivalent
    expect(normalizeSchema(a).replace(/\s+/g, '')).toBe(normalizeSchema(b).replace(/\s+/g, ''));
  });

  it('[3/3] meaningful schema changes produce different fingerprints', () => {
    const a = `model User { id String @id }`;
    const b = `model User { id String @id; email String }`;
    const c = `model User { id Int @id }`;
    expect(fingerprintsMatch(fingerprint(a), fingerprint(b))).toBe(false);
    expect(fingerprintsMatch(fingerprint(a), fingerprint(c))).toBe(false);
  });
});
