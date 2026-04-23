import { describe, it, expect } from 'vitest';
import { PasswordService } from '../../services/auth/password.service.js';

describe('PasswordService', () => {
  // ── Hashing ──
  it('hashes password and produces bcrypt format', async () => {
    const hash = await PasswordService.hash('StrongPass1');
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('produces different hashes for same password (salt)', async () => {
    const hash1 = await PasswordService.hash('StrongPass1');
    const hash2 = await PasswordService.hash('StrongPass1');
    expect(hash1).not.toBe(hash2);
  });

  // ── Comparison ──
  it('correctly verifies matching password', async () => {
    const hash = await PasswordService.hash('StrongPass1');
    const result = await PasswordService.compare('StrongPass1', hash);
    expect(result).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await PasswordService.hash('StrongPass1');
    const result = await PasswordService.compare('WrongPass1', hash);
    expect(result).toBe(false);
  });

  // ── Strength validation ──
  it('rejects password shorter than 8 characters', () => {
    expect(() => PasswordService.validateStrength('Abc1')).toThrow('at least 8');
  });

  it('rejects password longer than 128 characters', () => {
    const longPass = 'Aa1' + 'x'.repeat(126);
    expect(() => PasswordService.validateStrength(longPass)).toThrow('not exceed 128');
  });

  it('rejects password without uppercase', () => {
    expect(() => PasswordService.validateStrength('lowercase1')).toThrow('uppercase');
  });

  it('rejects password without lowercase', () => {
    expect(() => PasswordService.validateStrength('UPPERCASE1')).toThrow('lowercase');
  });

  it('rejects password without number', () => {
    expect(() => PasswordService.validateStrength('NoNumberHere')).toThrow('number');
  });

  it('accepts strong password', () => {
    expect(() => PasswordService.validateStrength('StrongPass1')).not.toThrow();
  });

  it('collects multiple errors in one throw', () => {
    expect(() => PasswordService.validateStrength('abc')).toThrow();
    try {
      PasswordService.validateStrength('abc');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('at least 8');
      expect(msg).toContain('uppercase');
      expect(msg).toContain('number');
    }
  });
});
