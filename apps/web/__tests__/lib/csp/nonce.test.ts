// apps/web/__tests__/lib/csp/nonce.test.ts
// ═══════════════════════════════════════════════════════════════
// CSP NONCE — Unit tests
// Pattern: same vitest + globals style as existing __tests__/lib/auth.test.ts.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { generateNonce, __testing__ } from '@/lib/csp/nonce';

describe('CSP — generateNonce', () => {
  it('returns a non-empty string', () => {
    const nonce = generateNonce();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
  });

  it('returns 24 characters (base64 of 16 random bytes)', () => {
    // base64 length = ceil(16 / 3) * 4 = 24, including 1 trailing '=' padding.
    const nonce = generateNonce();
    expect(nonce).toHaveLength(24);
  });

  it('produces 1000 unique nonces (collision check)', () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) set.add(generateNonce());
    expect(set.size).toBe(1000);
  });

  it('uses only base64 alphabet characters', () => {
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    for (let i = 0; i < 50; i++) {
      const nonce = generateNonce();
      expect(nonce).toMatch(base64Regex);
    }
  });

  it('exposes correct constant (16 bytes)', () => {
    expect(__testing__.NONCE_BYTES).toBe(16);
  });

  it('has sufficient entropy — 1000 samples spread across full byte space', () => {
    // Sanity check: collect the first byte (after base64 decode) of 1000 nonces.
    // Should be spread across many values, not concentrated.
    const firstBytes = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const nonce = generateNonce();
      // Decode first base64 char to byte. Not exact, but a proxy for entropy.
      firstBytes.add(nonce.charCodeAt(0));
    }
    // base64 uses 64 distinct chars; we should see >40 distinct first chars
    // in 1000 samples (much more than chance if RNG were biased).
    expect(firstBytes.size).toBeGreaterThan(40);
  });
});

describe('CSP — bytesToBase64 (internal)', () => {
  it('encodes empty array to empty string', () => {
    const result = __testing__.bytesToBase64(new Uint8Array(0));
    expect(result).toBe('');
  });

  it('encodes [0,0,0] to AAAA', () => {
    const result = __testing__.bytesToBase64(new Uint8Array([0, 0, 0]));
    expect(result).toBe('AAAA');
  });

  it('encodes [255,255,255] to ////', () => {
    const result = __testing__.bytesToBase64(new Uint8Array([255, 255, 255]));
    expect(result).toBe('////');
  });
});
