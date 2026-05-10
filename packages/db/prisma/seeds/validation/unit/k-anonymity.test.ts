import { describe, expect, it } from 'vitest';
import { validateKAnonymity } from '../../anonymization';

describe('k-anonymity validator', () => {
  it('passes when every quasi-identifier group has ≥k', () => {
    // 25 records distributed into 5 clean groups of 5 each.
    // Math: 5 distinct ages × 1 gender × 1 pincode = 5 groups
    //       25 records / 5 groups = 5 per group ✅ satisfies k=5
    const records = Array.from({ length: 25 }, (_, i) => ({
      ageYears: 20 + Math.floor(i / 5) * 10,
      gender: 'M',
      pincode: '110001',
    }));
    const r = validateKAnonymity(records, ['ageYears', 'gender', 'pincode'], 5);
    expect(r.passed).toBe(true);
    expect(r.minGroupSize).toBe(5);
    expect(r.totalGroups).toBe(5);
    expect(r.violatingGroups).toHaveLength(0);
  });

  it('fails when a group has <k', () => {
    const records = [
      { ageYears: 25, gender: 'M', pincode: '110001' },
      { ageYears: 95, gender: 'F', pincode: '110001' },
      { ageYears: 25, gender: 'M', pincode: '110001' },
    ];
    const r = validateKAnonymity(records, ['ageYears', 'gender', 'pincode'], 2);
    expect(r.passed).toBe(false);
    expect(r.violatingGroups.length).toBeGreaterThan(0);
  });

  it('handles empty record set as vacuously k-anonymous', () => {
    const r = validateKAnonymity([], ['ageYears'], 5);
    expect(r.passed).toBe(true);
    expect(r.totalGroups).toBe(0);
  });
});
