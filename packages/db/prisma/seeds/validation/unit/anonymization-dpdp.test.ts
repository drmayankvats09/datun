import { describe, expect, it } from 'vitest';
import { AnonymizationEngine } from '../../anonymization';

const engine = new AnonymizationEngine('DPDP');

describe('AnonymizationEngine — DPDP profile', () => {
  it('anonymizes Patient PII fields (name/phone/email/aadhaar)', () => {
    const { anonymized, auditEntry } = engine.anonymizeRecord('Patient', {
      id: 'p_1',
      name: 'Mayank Vats',
      firstName: 'Mayank',
      lastName: 'Vats',
      fullName: 'Mayank Vats',
      phone: '+919876543210',
      email: 'mayank@datun.com',
      aadhaar: '123456789012',
    });
    expect(anonymized.id).toBe('p_1');
    expect(auditEntry.fieldsMasked.length).toBeGreaterThan(0);
    expect(anonymized.firstName).not.toBe('Mayank');
    expect(anonymized.phone).not.toBe('+919876543210');
  });

  it('preserves non-PII fields (id, tier, isActive)', () => {
    const { anonymized } = engine.anonymizeRecord('Clinic', {
      id: 'c_1',
      tier: 'GROW',
      isActive: true,
    });
    expect(anonymized.id).toBe('c_1');
    expect(anonymized.tier).toBe('GROW');
    expect(anonymized.isActive).toBe(true);
  });

  it('audit entry captures undetected high-confidence PII fields', () => {
    const { auditEntry } = engine.anonymizeRecord('Patient', {
      id: 'p_1',
      randomEmailLike: 'someone@example.com',
    });
    expect(Array.isArray(auditEntry.undetectedPiiHighConfidence)).toBe(true);
  });

  it('batch run with k-anonymity validation', async () => {
    const records = Array.from({ length: 25 }, (_, i) => ({
      id: `p_${i}`,
      ageYears: 20 + (i % 5) * 10,
      gender: i % 2 === 0 ? 'M' : 'F',
      pincode: '110001',
      preferredLocale: 'hindi',
    }));
    const result = await engine.anonymizeRecords('Patient', records, { validateKAnonymity: true });
    expect(result.recordsProcessed).toBe(25);
    expect(result.kAnonymityReport).not.toBeNull();
  });
});
