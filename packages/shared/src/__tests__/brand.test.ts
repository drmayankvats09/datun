import { describe, it, expect } from 'vitest';
import { BRAND } from '../brand.js';

describe('BRAND constants', () => {
  it('name is Datun (not Datun AI — AI dropped from brand)', () => {
    expect(BRAND.name).toBe('Datun');
  });

  it('tagline matches mission statement', () => {
    expect(BRAND.tagline).toBe('Everyone deserves care.');
  });

  it('AI name matches brand name', () => {
    expect(BRAND.aiName).toBe('Datun');
  });

  it('copyright includes current year', () => {
    const year = new Date().getFullYear();
    expect(BRAND.copyright()).toContain(String(year));
  });

  it('copyright with custom year', () => {
    expect(BRAND.copyright(2030)).toContain('2030');
  });

  it('legal name is set', () => {
    expect(BRAND.legalName).toBeDefined();
    expect(BRAND.legalName.length).toBeGreaterThan(0);
  });

  it('description is set and meaningful', () => {
    expect(BRAND.description).toBeDefined();
    expect(BRAND.description.length).toBeGreaterThan(20);
  });
});
