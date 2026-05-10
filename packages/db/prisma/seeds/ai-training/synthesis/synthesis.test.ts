import { describe, expect, it } from 'vitest';
import { exactDedup, semanticDedup } from './dedup-engine';
import { enumeratePersonas } from './persona-generator';

describe('Dedup engine', () => {
  it('exactDedup removes byte-identical complaints', () => {
    const ex = [
      {
        id: '1',
        chiefComplaint: 'tooth pain',
        locale: 'english',
        patientContext: { ageYears: 30, gender: 'M', safetyConstraints: [] },
        provenance: {} as never,
      },
      {
        id: '2',
        chiefComplaint: 'tooth pain',
        locale: 'english',
        patientContext: { ageYears: 30, gender: 'M', safetyConstraints: [] },
        provenance: {} as never,
      },
    ] as never[];
    expect(exactDedup(ex).length).toBe(1);
  });

  it('semanticDedup catches paraphrases', async () => {
    const ex = [
      {
        id: '1',
        chiefComplaint: 'I have severe tooth pain in my upper molar',
        locale: 'english',
        patientContext: {} as never,
        provenance: {} as never,
      },
      {
        id: '2',
        chiefComplaint: 'severe tooth pain in my upper molar I have',
        locale: 'english',
        patientContext: {} as never,
        provenance: {} as never,
      },
      {
        id: '3',
        chiefComplaint: 'My gums are bleeding when I brush',
        locale: 'english',
        patientContext: {} as never,
        provenance: {} as never,
      },
    ] as never[];
    const result = await semanticDedup(ex, 0.5);
    expect(result.length).toBe(2);
  });
});

describe('Persona enumeration', () => {
  it('respects pregnancy gating to female adult only', () => {
    const out = [...enumeratePersonas()].filter((p) => p.safetyConstraints.includes('pregnancy'));
    expect(out.every((p) => p.gender === 'F' && p.ageYears >= 18 && p.ageYears <= 50)).toBe(true);
  });

  it('respects child-under-6 to age <=5', () => {
    const out = [...enumeratePersonas()].filter((p) =>
      p.safetyConstraints.includes('child-under-6'),
    );
    expect(out.every((p) => p.ageYears <= 5)).toBe(true);
  });
});
