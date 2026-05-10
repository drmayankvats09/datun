// ═══════════════════════════════════════════════════════════════
// HIPAA SAFE HARBOR — verifies AnonymizationEngine masks the fields
// covered by HIPAA_RULES (45 CFR §164.514(b)(2) Safe Harbor identifiers).
//
// Coverage today (Patient + User + Consultation models):
//   - Names (fullName)
//   - Geographic subdivisions (addressLine1, pincode → first 3)
//   - Dates (dateOfBirth → year-only via truncate)
//   - Phone, email, government ID (aadhaar)
//   - MRN (medical record number — pseudonymized)
//   - Photographic images (Consultation.photoUrls — redacted)
//   - IP addresses (User.lastIp — nulled)
//
// Out-of-scope identifiers (HIPAA references that do not exist in our
// Indian dental schema): SSN, fax, license, vehicle ID, device ID, web URL,
// biometric ID, full-face photo, health plan beneficiary number, account
// number. When those tables enter the schema (international expansion),
// extend HIPAA_RULES + this test.
// ═══════════════════════════════════════════════════════════════

import { describe, expect, it } from 'vitest';
import { AnonymizationEngine } from '../../anonymization';

const engine = new AnonymizationEngine('HIPAA');

describe('HIPAA Safe Harbor — Patient PII masking', () => {
  it('masks fullName via faker', () => {
    const { anonymized } = engine.anonymizeRecord('Patient', {
      id: 'p1',
      fullName: 'Mayank Vats',
    });
    expect(anonymized.fullName).not.toBe('Mayank Vats');
    expect(typeof anonymized.fullName).toBe('string');
  });

  it('masks address line 1 via faker', () => {
    const { anonymized } = engine.anonymizeRecord('Patient', {
      id: 'p1',
      addressLine1: '123 Real Street, Bangalore',
    });
    expect(anonymized.addressLine1).not.toBe('123 Real Street, Bangalore');
  });

  it('truncates pincode to first 3 digits (population >20K rule)', () => {
    const { anonymized } = engine.anonymizeRecord('Patient', {
      id: 'p1',
      pincode: '110001',
    });
    expect(anonymized.pincode).toBe('110');
  });

  it('truncates dateOfBirth to year-only (4 chars)', () => {
    const { anonymized } = engine.anonymizeRecord('Patient', {
      id: 'p1',
      dateOfBirth: '1985-06-15',
    });
    expect(anonymized.dateOfBirth).toBe('1985');
  });

  it('nullifies phone (HIPAA SH §4)', () => {
    const { anonymized } = engine.anonymizeRecord('Patient', {
      id: 'p1',
      phone: '+919876543210',
    });
    expect(anonymized.phone).toBeNull();
  });

  it('nullifies email (HIPAA SH §6)', () => {
    const { anonymized } = engine.anonymizeRecord('Patient', {
      id: 'p1',
      email: 'real.user@example.com',
    });
    expect(anonymized.email).toBeNull();
  });

  it('nullifies aadhaar (HIPAA SH §7 SSN equivalent)', () => {
    const { anonymized } = engine.anonymizeRecord('Patient', {
      id: 'p1',
      aadhaar: '987654321098',
    });
    expect(anonymized.aadhaar).toBeNull();
  });

  it('pseudonymizes mrn (medical record number — HIPAA SH §8)', () => {
    const { anonymized } = engine.anonymizeRecord('Patient', {
      id: 'p1',
      mrn: 'MRN-2024-A12345',
    });
    expect(anonymized.mrn).not.toBe('MRN-2024-A12345');
    expect(String(anonymized.mrn).startsWith('mrn-')).toBe(true);
  });

  it('preserves id (non-PII anchor)', () => {
    const { anonymized } = engine.anonymizeRecord('Patient', {
      id: 'p1',
      fullName: 'X',
    });
    expect(anonymized.id).toBe('p1');
  });

  it('audit entry records masked fields and compliance profile', () => {
    const { auditEntry } = engine.anonymizeRecord('Patient', {
      id: 'p1',
      fullName: 'Test',
      phone: '+919999999999',
      randomField: 'value',
    });
    expect(auditEntry.fieldsMasked.length + auditEntry.fieldsNullified.length).toBeGreaterThan(0);
    expect(Array.isArray(auditEntry.undetectedPiiHighConfidence)).toBe(true);
    expect(auditEntry.complianceProfile).toBe('HIPAA');
  });
});

describe('HIPAA Safe Harbor — Consultation + User models', () => {
  it('redacts Consultation.photoUrls (HIPAA SH §17 photographic)', () => {
    const { anonymized } = engine.anonymizeRecord('Consultation', {
      id: 'c1',
      photoUrls: ['https://cdn.example.com/photo1.jpg'],
    });
    expect(anonymized.photoUrls).toBe('[]');
  });

  it('nullifies User.lastIp (HIPAA SH §15 IP)', () => {
    const { anonymized } = engine.anonymizeRecord('User', {
      id: 'u1',
      lastIp: '192.168.1.42',
    });
    expect(anonymized.lastIp).toBeNull();
  });
});
