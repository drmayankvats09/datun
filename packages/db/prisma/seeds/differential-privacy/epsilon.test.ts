// ═══════════════════════════════════════════════════════════════
// EPSILON VALIDATOR TESTS
// Source: Dwork-Roth Algorithmic Foundations of DP, Chapter 3
// ═══════════════════════════════════════════════════════════════
import { describe, expect, it } from 'vitest';
import { computeEpsilon, validateForCompliance } from './epsilon-validator';

describe('computeEpsilon', () => {
  it('returns Infinity for invalid k or N', () => {
    const r = computeEpsilon(10, 0);
    expect(r.epsilon).toBe(Infinity);
    expect(r.passed).toBe(false);
    expect(r.membershipInferenceRisk).toBe('high');
  });

  it('returns low risk for large k', () => {
    const r = computeEpsilon(10000, 100);
    expect(r.epsilon).toBeLessThan(5);
    expect(r.recommendedEpsilon).toBe(1.0);
  });

  it('flags small k as high-risk', () => {
    const r = computeEpsilon(10000, 2);
    expect(r.epsilon).toBeGreaterThan(3);
    expect(r.membershipInferenceRisk).toBe('high');
  });

  it('respects noiseScale parameter', () => {
    const noNoise = computeEpsilon(1000, 5, 1.0);
    const heavyNoise = computeEpsilon(1000, 5, 5.0);
    expect(heavyNoise.epsilon).toBeLessThan(noNoise.epsilon);
  });

  it('rounds epsilon to 3 decimal places', () => {
    const r = computeEpsilon(100, 5);
    const decimalString = String(r.epsilon).split('.')[1] ?? '';
    expect(decimalString.length).toBeLessThanOrEqual(3);
  });
});

describe('validateForCompliance', () => {
  it('DPDP allows ε up to 3.0', () => {
    expect(validateForCompliance(2.5, 'DPDP')).toBe(true);
    expect(validateForCompliance(3.0, 'DPDP')).toBe(true);
    expect(validateForCompliance(3.1, 'DPDP')).toBe(false);
  });

  it('HIPAA requires ε ≤ 1.0', () => {
    expect(validateForCompliance(0.9, 'HIPAA')).toBe(true);
    expect(validateForCompliance(1.0, 'HIPAA')).toBe(true);
    expect(validateForCompliance(1.1, 'HIPAA')).toBe(false);
  });

  it('GDPR requires ε ≤ 1.0', () => {
    expect(validateForCompliance(0.5, 'GDPR')).toBe(true);
    expect(validateForCompliance(1.5, 'GDPR')).toBe(false);
  });
});
