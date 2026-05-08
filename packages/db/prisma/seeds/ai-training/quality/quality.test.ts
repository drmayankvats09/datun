import { describe, expect, it } from 'vitest';
import { computeIfdScore } from './ifd-scorer';
import { selectDiverse } from './diversity-selector';

describe('IFD Scorer', () => {
  it('higher score for richer text', async () => {
    const low = await computeIfdScore('pain');
    const high = await computeIfdScore(
      'I have throbbing pain in my upper-right molar that started 3 days ago after eating ice cream, and the pain spreads to my ear and jaw',
    );
    expect(high).toBeGreaterThan(low);
  });
});

describe('Diversity Selector (MMR)', () => {
  it('picks diverse examples even with similar quality scores', () => {
    const candidates = [
      {
        id: '1',
        chiefComplaint: 'tooth pain in upper left',
        qualityScore: 4,
        locale: 'english' as const,
        patientContext: {} as never,
        provenance: {} as never,
      },
      {
        id: '2',
        chiefComplaint: 'tooth pain in upper left molar',
        qualityScore: 4,
        locale: 'english' as const,
        patientContext: {} as never,
        provenance: {} as never,
      },
      {
        id: '3',
        chiefComplaint: 'gums bleeding when brushing',
        qualityScore: 4,
        locale: 'english' as const,
        patientContext: {} as never,
        provenance: {} as never,
      },
    ];
    const selected = selectDiverse(candidates, 2, 0.5);
    expect(selected.length).toBe(2);
    // Should pick item 1 + item 3 (most diverse), not 1 + 2 (similar)
    expect(selected.map((s) => s.id).sort()).toEqual(['1', '3']);
  });
});
