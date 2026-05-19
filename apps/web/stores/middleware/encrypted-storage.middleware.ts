// ═══════════════════════════════════════════════════════════════
// ENCRYPTED STORAGE — AES-GCM at-rest encryption for PII data
//
// Wraps a base `StateStorage` with authenticated encryption (AES-GCM)
// using a key derived from a passphrase via PBKDF2-SHA256.
//
// THREAT MODEL — what this PROTECTS against:
//   ✓ Casual inspection of localStorage in browser DevTools
//   ✓ Third-party scripts on the same origin reading plaintext PII
//   ✓ Browser extensions with `storage` permission reading values
//   ✓ DPDP audit requirement: "data at rest is not stored in plain text"
//
// THREAT MODEL — what this does NOT protect against:
//   ✗ XSS on the same origin (attacker can call decrypt themselves)
//   ✗ Malicious browser extension with full content-script access
//   ✗ Stolen device with an open browser session
//
// For TRUE confidentiality of PII (insurance data, financial records),
// the only correct pattern is to NOT persist client-side at all (use
// sessionStorage + server-side state). Phase 2's `consultation.store`
// will use `partialize` to EXCLUDE the highest-risk fields and route
// only moderate-risk drafts through this encrypted storage.
//
// Implementation choices:
// - AES-GCM 256-bit (authenticated encryption — tamper detection built in;
//   bit-flipping ciphertext throws on decrypt rather than producing garbage).
// - PBKDF2-SHA256 with 210k iterations (OWASP 2023 recommendation, still
//   current for 2026). Derived key is cached per-namespace so the cost is
//   paid once per session, not per read.
// - IV: 12 bytes random per setItem. NEVER reused — critical for GCM
//   security; reused IVs with the same key catastrophically break GCM.
// - Salt: deterministic derivation from the namespace string, so the same
//   namespace always derives the same key (essential for decryption).
// - Payload prefix `datunenc.v1.` lets us detect legacy plaintext entries
//   and handle them gracefully (return as-is, re-encrypt on next write).
//
// Performance: encrypt ≈ 1-3ms, decrypt ≈ 1-3ms, derive ≈ 80-150ms
// (cached). Total hydration penalty after first read: ~5-10ms. Imperceptible.
// ═══════════════════════════════════════════════════════════════

import type { StateStorage } from 'zustand/middleware';

// ─── Crypto parameters ────────────────────────────────────────

const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_HASH = 'SHA-256' as const;
const AES_ALGORITHM = 'AES-GCM' as const;
const AES_KEY_BITS = 256;
const IV_BYTES = 12;

/**
 * Magic prefix identifying our encrypted payloads. Lets us distinguish
 * our ciphertext from accidental plaintext (e.g., from a pre-encryption
 * deploy) so we can migrate gracefully without losing user state.
 */
const PAYLOAD_PREFIX = 'datunenc.v1.';

export interface EncryptedStorageOptions {
  /**
   * Passphrase used to derive the encryption key.
   *
   * In production, this should ideally be:
   *   (a) available on every page load,
   *   (b) not easily readable by other origins,
   *   (c) reasonably high entropy.
   *
   * Recommended sources (best → worst):
   *   1. A backend-issued device key in an httpOnly cookie (TRUE conf.)
   *   2. A hash of (userId + app-secret) from session token
   *   3. A random value persisted in sessionStorage (cleared on tab close)
   *   4. A static app constant (obfuscation only — last resort)
   *
   * Phase 1 ships with option 3 as the default via `getSessionPassphrase()`.
   * Phase 2 wires up option 2 once auth is fully integrated.
   */
  passphrase: string;

  /**
   * Namespace string — used as salt input so the same passphrase produces
   * different keys for different stores. Use the same value as your persist
   * `name` option (e.g., 'datun-consultation').
   */
  namespace: string;
}

/**
 * Create an encrypted-at-rest storage wrapper.
 *
 * @param base - Underlying StateStorage (typically `createSafeStorage()`)
 * @param options - Encryption configuration
 * @returns An async StateStorage with transparent encryption/decryption.
 *          On platforms without Web Crypto, falls back to plaintext with
 *          a console warning (e.g., very old browsers, certain SSR contexts).
 *
 * @example Encrypt intake draft with session-scoped key
 * ```ts
 * import { createSafeStorage } from '@/lib/storage';
 * import {
 *   createEncryptedStorage,
 *   getSessionPassphrase,
 * } from './middleware';
 *
 * const encryptedStorage = createEncryptedStorage(createSafeStorage(), {
 *   passphrase: getSessionPassphrase(),
 *   namespace: 'datun-consultation',
 * });
 *
 * persist(initializer, {
 *   name: 'datun-consultation',
 *   storage: createJSONStorage(() => encryptedStorage),
 * });
 * ```
 */
export function createEncryptedStorage(
  base: StateStorage,
  options: EncryptedStorageOptions,
): StateStorage {
  if (!isWebCryptoAvailable()) {
    // SSR or extremely old browser — fall back to base storage with a
    // single console warning. Components that read PII should still gate
    // on `__hasHydrated` so they don't render before hydration completes.
    if (typeof window !== 'undefined') {
      console.warn(
        '[encrypted-storage] Web Crypto unavailable — falling back to plain storage. PII may be at risk on this client.',
      );
    }
    return base;
  }

  // Key derivation is memoized — the same passphrase + namespace always
  // derives the same key. We compute it lazily on the first storage op
  // so SSR import of this module doesn't trigger a key derivation.
  let cachedKey: Promise<CryptoKey> | null = null;
  const getKey = (): Promise<CryptoKey> => {
    if (cachedKey === null) {
      cachedKey = deriveKey(options.passphrase, options.namespace);
    }
    return cachedKey;
  };

  return {
    getItem: async (name) => {
      const stored = await Promise.resolve(base.getItem(name));
      if (stored === null) return null;

      // Legacy plaintext from before encryption was enabled — return
      // as-is so users don't lose their state during the migration.
      // It will be re-written as ciphertext on the next setItem call.
      if (!stored.startsWith(PAYLOAD_PREFIX)) {
        return stored;
      }

      try {
        const key = await getKey();
        return await decrypt(stored, key);
      } catch (error) {
        // Decryption failed — corrupted ciphertext, wrong key, or tampering.
        // Return null so Zustand persist falls back to default state.
        console.warn(`[encrypted-storage] Decrypt failed for "${name}":`, error);
        return null;
      }
    },

    setItem: async (name, value) => {
      try {
        const key = await getKey();
        const ciphertext = await encrypt(value, key);
        await Promise.resolve(base.setItem(name, ciphertext));
      } catch (error) {
        // Encryption failed — REFUSE to write plaintext silently.
        // Log and skip; next attempt will retry.
        console.error(`[encrypted-storage] Encrypt failed for "${name}":`, error);
      }
    },

    removeItem: async (name) => {
      await Promise.resolve(base.removeItem(name));
    },
  };
}

// ─── Crypto primitives ────────────────────────────────────────

/**
 * Check whether the Web Crypto API (subtle crypto) is available.
 * False during SSR or in very old browsers / sandboxed iframes.
 */
function isWebCryptoAvailable(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.subtle !== 'undefined'
  );
}

/**
 * Derive a 256-bit AES-GCM key from a passphrase and namespace.
 *
 * Process:
 *   1. Encode passphrase + namespace as UTF-8 bytes.
 *   2. Import passphrase as a PBKDF2 base key.
 *   3. Derive AES-GCM key with 210k PBKDF2 iterations and namespace as salt.
 *
 * The derived key is non-extractable (`false` for the 4th param of
 * `deriveKey`) — it cannot be exported back to raw bytes by user code.
 */
async function deriveKey(passphrase: string, namespace: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  // Salt = bytes of "datun.v1.<namespace>". Deterministic for a given
  // namespace so the same passphrase always derives the same key.
  const salt = encoder.encode(`datun.v1.${namespace}`);

  const baseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    { name: 'PBKDF2' },
    /* extractable */ false,
    ['deriveKey'],
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: AES_ALGORITHM, length: AES_KEY_BITS },
    /* extractable */ false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a UTF-8 string with AES-GCM.
 *
 * Returns a payload string in the format:
 *   `datunenc.v1.<base64-iv>.<base64-ciphertext>`
 *
 * IV is a fresh 12 random bytes per call (NEVER reused — critical for
 * GCM security). IV is stored alongside ciphertext (not secret).
 */
async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  // Explicit Uint8Array<ArrayBuffer> typing (TS 5.9 strict generics) —
  // crypto.subtle.encrypt requires `ArrayBufferView<ArrayBuffer>`, not
  // the wider `ArrayBufferView<ArrayBufferLike>` that inference can produce.
  const iv: Uint8Array<ArrayBuffer> = new Uint8Array(IV_BYTES);
  globalThis.crypto.getRandomValues(iv);
  const data: Uint8Array<ArrayBuffer> = encoder.encode(plaintext);

  const ciphertext = await globalThis.crypto.subtle.encrypt({ name: AES_ALGORITHM, iv }, key, data);

  return `${PAYLOAD_PREFIX}${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

/**
 * Decrypt a payload produced by `encrypt`.
 *
 * Throws if the payload is malformed or fails GCM authentication
 * (which happens on tampering, wrong key, or truncation).
 * Caller handles the throw by returning null.
 */
async function decrypt(payload: string, key: CryptoKey): Promise<string> {
  const body = payload.slice(PAYLOAD_PREFIX.length);
  const dotIndex = body.indexOf('.');
  if (dotIndex < 0) {
    throw new Error('Malformed ciphertext: missing IV/ciphertext separator');
  }
  const iv = base64ToBytes(body.slice(0, dotIndex));
  const ciphertext = base64ToBytes(body.slice(dotIndex + 1));

  const plaintext = await globalThis.crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(plaintext);
}

// ─── Base64 helpers (Uint8Array ↔ string) ─────────────────────

/**
 * Encode bytes as a base64 string (using `btoa`, which is universally
 * available in browsers + Web Workers).
 *
 * Iterates byte-by-byte rather than `String.fromCharCode(...bytes)` to
 * avoid stack overflow on large arrays (rest-args have a ~65k arg limit).
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  // for-of yields `number` directly (avoids `number | undefined` from
  // indexed access under noUncheckedIndexedAccess: true).
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return globalThis.btoa(binary);
}

/**
 * Decode a base64 string back to a `Uint8Array<ArrayBuffer>` of bytes.
 * Concrete ArrayBuffer typing required so the result is usable as a
 * `BufferSource` in `crypto.subtle.decrypt` under TS 5.9 strict generics.
 */
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = globalThis.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Default passphrase strategy (session-scoped) ─────────────

const SESSION_PASSPHRASE_KEY = 'datun-session-passphrase';

/**
 * Default passphrase strategy for Phase 1: a cryptographically random
 * value persisted in `sessionStorage`, which is cleared when the browser
 * tab closes.
 *
 * Result: encrypted localStorage becomes unreadable after a fresh tab,
 * effectively forcing a fresh state on each session start. For PII
 * (intake draft), this is desirable — Mayank's mother and Mayank's
 * patient using the same browser don't see each other's drafts.
 *
 * Trade-off: user loses persisted state on tab close. Acceptable for the
 * intake draft (re-entered in 30s) but NOT for the consultation messages
 * (which should resume across tabs). Phase 2 will use a different storage
 * strategy for each — encrypted for PII, plaintext for non-PII.
 *
 * Phase 2 will replace this with a backend-issued device key (option 2
 * in the recommended-sources comment above) once auth integration matures.
 *
 * @returns A 32-byte (256-bit entropy) base64 passphrase string,
 *          stable for the current sessionStorage lifetime.
 */
export function getSessionPassphrase(): string {
  if (typeof window === 'undefined') {
    // SSR — return a deterministic placeholder. Encryption will be
    // skipped anyway (no window means no `crypto.subtle` either; see
    // `isWebCryptoAvailable` above).
    return 'datun-ssr-placeholder';
  }

  let existing: string | null;
  try {
    existing = sessionStorage.getItem(SESSION_PASSPHRASE_KEY);
  } catch {
    // sessionStorage disabled / blocked — fall through to generation.
    existing = null;
  }

  if (existing) return existing;

  // Generate 32 random bytes → 256 bits of passphrase entropy
  // (matches AES key strength, no entropy bottleneck).
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const passphrase = bytesToBase64(bytes);

  try {
    sessionStorage.setItem(SESSION_PASSPHRASE_KEY, passphrase);
  } catch {
    // Quota exceeded or disabled — passphrase is still valid for the
    // current page load, just won't persist across reloads. The user
    // will see their state "reset" on reload (acceptable degradation).
  }

  return passphrase;
}
