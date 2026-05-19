// ═══════════════════════════════════════════════════════════════
// ENCRYPTED STORAGE TESTS — AES-GCM + PBKDF2 wrapper for StateStorage
//
// Verifies:
//   - Round-trip: setItem → getItem returns original plaintext
//   - Ciphertext has the `datunenc.v1.` prefix (forward compat)
//   - Different IVs on repeated writes (GCM correctness)
//   - Tamper detection: modified ciphertext returns null on read
//   - Legacy plaintext (no prefix) returned as-is
//   - Namespace isolation: same passphrase + different namespace
//     produces different keys → mutual decryption fails
//   - getSessionPassphrase memoizes via sessionStorage
//
// Runs in Node 22+ where globalThis.crypto.subtle is native.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import {
  createEncryptedStorage,
  getSessionPassphrase,
} from '../../../stores/middleware/encrypted-storage.middleware';

const PASSPHRASE = 'test-passphrase-256-bit-entropy-value-for-tests-only';

// ─── In-memory test storage ──────────────────────────────────

function createMemoryStorage(): StateStorage & {
  dump: () => Record<string, string>;
  setRaw: (k: string, v: string) => void;
} {
  const map = new Map<string, string>();
  return {
    getItem: (name) => map.get(name) ?? null,
    setItem: (name, value) => {
      map.set(name, value);
    },
    removeItem: (name) => {
      map.delete(name);
    },
    dump: () => Object.fromEntries(map.entries()),
    setRaw: (k, v) => map.set(k, v),
  };
}

// ─── Round-trip ──────────────────────────────────────────────

describe('createEncryptedStorage — round-trip', () => {
  it('encrypts on write, decrypts back to original on read', async () => {
    const base = createMemoryStorage();
    const enc = createEncryptedStorage(base, {
      passphrase: PASSPHRASE,
      namespace: 'test-ns',
    });

    const plaintext = JSON.stringify({ user: 'Mayank', age: 26 });
    await enc.setItem('k', plaintext);

    const stored = base.dump()['k'];
    expect(stored).toBeTruthy();
    expect(stored!.startsWith('datunenc.v1.')).toBe(true);
    // Stored ciphertext is NOT the plaintext
    expect(stored).not.toBe(plaintext);

    expect(await enc.getItem('k')).toBe(plaintext);
  });

  it('handles unicode payloads', async () => {
    const base = createMemoryStorage();
    const enc = createEncryptedStorage(base, {
      passphrase: PASSPHRASE,
      namespace: 'test-ns',
    });

    const plaintext = JSON.stringify({
      hindi: 'दांत में दर्द',
      tamil: 'பல் வலி',
      emoji: '🦷✨',
    });
    await enc.setItem('k', plaintext);
    expect(await enc.getItem('k')).toBe(plaintext);
  });

  it('produces different ciphertext on repeated writes (fresh IV)', async () => {
    const base = createMemoryStorage();
    const enc = createEncryptedStorage(base, {
      passphrase: PASSPHRASE,
      namespace: 'test-ns',
    });

    await enc.setItem('k', 'same-plaintext');
    const first = base.dump()['k'];
    await enc.setItem('k', 'same-plaintext');
    const second = base.dump()['k'];

    // Different IVs → different ciphertexts even for identical plaintext.
    // This is a critical GCM property; reused IVs catastrophically break GCM.
    expect(first).not.toBe(second);
    // But both decrypt to the same plaintext
    expect(await enc.getItem('k')).toBe('same-plaintext');
  });
});

// ─── Tamper detection ────────────────────────────────────────

describe('createEncryptedStorage — tamper detection', () => {
  it('returns null when ciphertext is mangled', async () => {
    const base = createMemoryStorage();
    const enc = createEncryptedStorage(base, {
      passphrase: PASSPHRASE,
      namespace: 'test-ns',
    });

    await enc.setItem('k', 'sensitive-data');

    // Mangle the stored ciphertext (flip a few base64 chars).
    const original = base.dump()['k'];
    expect(original).toBeTruthy();
    const mangled = original!.slice(0, -8) + 'XXXXXXXX';
    base.setRaw('k', mangled);

    // GCM auth tag check fails → decrypt throws → getItem returns null.
    expect(await enc.getItem('k')).toBeNull();
  });

  it('returns null when payload separator is missing', async () => {
    const base = createMemoryStorage();
    const enc = createEncryptedStorage(base, {
      passphrase: PASSPHRASE,
      namespace: 'test-ns',
    });

    base.setRaw('k', 'datunenc.v1.no_dot_separator_here');
    expect(await enc.getItem('k')).toBeNull();
  });
});

// ─── Backward compatibility (legacy plaintext) ───────────────

describe('createEncryptedStorage — legacy plaintext compat', () => {
  it('returns plaintext as-is when stored without the prefix', async () => {
    const base = createMemoryStorage();
    const enc = createEncryptedStorage(base, {
      passphrase: PASSPHRASE,
      namespace: 'test-ns',
    });

    // Simulate a pre-encryption persist entry (raw JSON).
    base.setRaw('legacy', '{"user":"old"}');

    // Read returns the plaintext as-is (no decryption attempt).
    expect(await enc.getItem('legacy')).toBe('{"user":"old"}');
  });

  it('next write encrypts the legacy entry going forward', async () => {
    const base = createMemoryStorage();
    const enc = createEncryptedStorage(base, {
      passphrase: PASSPHRASE,
      namespace: 'test-ns',
    });

    base.setRaw('migrating', '{"old":"plaintext"}');
    expect(await enc.getItem('migrating')).toBe('{"old":"plaintext"}');

    // Now write through the encrypted wrapper.
    await enc.setItem('migrating', '{"new":"data"}');
    const stored = base.dump()['migrating'];
    expect(stored).toBeTruthy();
    expect(stored!.startsWith('datunenc.v1.')).toBe(true);
    expect(await enc.getItem('migrating')).toBe('{"new":"data"}');
  });
});

// ─── Namespace isolation ─────────────────────────────────────

describe('createEncryptedStorage — namespace isolation', () => {
  it('different namespaces produce different keys (decrypt fails cross-ns)', async () => {
    const base = createMemoryStorage();
    const encA = createEncryptedStorage(base, {
      passphrase: PASSPHRASE,
      namespace: 'namespace-a',
    });
    const encB = createEncryptedStorage(base, {
      passphrase: PASSPHRASE,
      namespace: 'namespace-b',
    });

    // Write via namespace A.
    await encA.setItem('shared-key', 'secret-from-a');

    // Read same key via namespace B → wrong key → null.
    expect(await encB.getItem('shared-key')).toBeNull();
    // Read via namespace A → correct key → original plaintext.
    expect(await encA.getItem('shared-key')).toBe('secret-from-a');
  });
});

// ─── Missing key ─────────────────────────────────────────────

describe('createEncryptedStorage — missing key', () => {
  it('returns null for keys never written', async () => {
    const base = createMemoryStorage();
    const enc = createEncryptedStorage(base, {
      passphrase: PASSPHRASE,
      namespace: 'test-ns',
    });
    expect(await enc.getItem('never-written')).toBeNull();
  });

  it('removeItem clears the encrypted entry', async () => {
    const base = createMemoryStorage();
    const enc = createEncryptedStorage(base, {
      passphrase: PASSPHRASE,
      namespace: 'test-ns',
    });
    await enc.setItem('k', 'data');
    await enc.removeItem('k');
    expect(base.dump()['k']).toBeUndefined();
  });
});

// ─── getSessionPassphrase ────────────────────────────────────

describe('getSessionPassphrase', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('generates and persists a passphrase in sessionStorage', () => {
    const passphrase = getSessionPassphrase();
    expect(typeof passphrase).toBe('string');
    expect(passphrase.length).toBeGreaterThan(20); // base64 of 32 bytes ≥ 43 chars
    expect(sessionStorage.getItem('datun-session-passphrase')).toBe(passphrase);
  });

  it('memoizes — returns the same passphrase across calls', () => {
    const p1 = getSessionPassphrase();
    const p2 = getSessionPassphrase();
    const p3 = getSessionPassphrase();
    expect(p1).toBe(p2);
    expect(p2).toBe(p3);
  });

  it('regenerates after sessionStorage is cleared (simulating new tab)', () => {
    const p1 = getSessionPassphrase();
    sessionStorage.clear();
    const p2 = getSessionPassphrase();
    expect(p1).not.toBe(p2);
  });
});
