// apps/web/__tests__/lib/csp/inline-hashes.test.ts
// ═══════════════════════════════════════════════════════════════
// INLINE HASH REGISTRY — Schema tests
// Validates that the auto-generated registry file maintains structure.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { INLINE_SCRIPT_HASHES, __INLINE_HASHES_MANAGED_BY__ } from '@/lib/csp/inline-hashes';

describe('CSP — inline-hashes registry', () => {
  it('exports an array (may be empty before first build)', () => {
    expect(Array.isArray(INLINE_SCRIPT_HASHES)).toBe(true);
  });

  it('every entry follows the sha-prefix-base64 format', () => {
    const validPattern = /^sha(256|384|512)-[A-Za-z0-9+/]+={0,2}$/;
    for (const hash of INLINE_SCRIPT_HASHES) {
      expect(hash).toMatch(validPattern);
    }
  });

  it('contains no duplicates', () => {
    const set = new Set(INLINE_SCRIPT_HASHES);
    expect(set.size).toBe(INLINE_SCRIPT_HASHES.length);
  });

  it('declares the generator marker', () => {
    expect(__INLINE_HASHES_MANAGED_BY__).toBe('scripts/build-inline-hashes.ts');
  });
});
