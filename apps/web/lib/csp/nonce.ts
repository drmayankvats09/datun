// apps/web/lib/csp/nonce.ts
// ═══════════════════════════════════════════════════════════════
// CSP NONCE GENERATOR — Edge + Node runtime compatible
//
// Generates a cryptographically secure 128-bit random value, base64-encoded,
// for use in Content-Security-Policy `script-src 'nonce-...'` directive.
//
// Why 128 bits? OWASP CSP cheat sheet + Google strict-CSP guide both mandate
// minimum 128 bits of entropy. At 1 trillion guesses/sec, brute-forcing 2^128
// would take longer than the age of the universe (~10^13 years vs 10^10).
//
// Why Web Crypto (`crypto.getRandomValues`) and NOT Node's `crypto.randomBytes`?
//   - Next.js 16 proxy.ts can run on edge runtime (Vercel Edge / Cloudflare Workers)
//   - Edge runtime does NOT have Node built-ins (no `crypto.randomBytes`)
//   - Web Crypto API is the cross-runtime standard (MDN, WHATWG)
//   - Stripe / GitHub / Vercel — all use Web Crypto for edge-compatible nonce gen
//
// Pattern: Next.js official "strict CSP" example, Google web.dev/strict-csp.
// ═══════════════════════════════════════════════════════════════

/** Number of random bytes for nonce (128 bits = 16 bytes). */
const NONCE_BYTES = 16;

/**
 * Base64-encodes a Uint8Array without depending on `Buffer` (Node-only).
 *
 * Edge runtime lacks `Buffer`, so we use `btoa` with String.fromCharCode.
 * Each byte (0-255) maps to a single char via String.fromCharCode — valid input
 * for `btoa`. Pattern: Vercel Edge Functions docs example.
 *
 * @param bytes - Raw random bytes
 * @returns Base64-encoded string (URL-safe characters preserved)
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    // bytes[i] is always defined here (i is bounded by .length), but TS
    // doesn't narrow array index access. Non-null assertion is safe.
    binary += String.fromCharCode(bytes[i]!);
  }
  // `btoa` is globally available in both Node 18+ and edge runtimes.
  return btoa(binary);
}

/**
 * Generate a single-use CSP nonce.
 *
 * **MUST be called per-request.** Reusing a nonce across requests defeats
 * its purpose (an attacker who learns the nonce for request A could use it
 * for request B). The proxy.ts middleware calls this once per incoming request.
 *
 * The returned string is safe to:
 *   - Embed in a `Content-Security-Policy` HTTP header value
 *   - Set as a `nonce="..."` attribute on `<script>` / `<style>` tags
 *
 * No special characters that would require HTML escaping (base64 alphabet:
 * A-Z, a-z, 0-9, +, /, =).
 *
 * @returns A 24-character base64-encoded 128-bit nonce.
 *
 * @example
 *   const nonce = generateNonce();
 *   response.headers.set('Content-Security-Policy', `script-src 'nonce-${nonce}'`);
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(NONCE_BYTES);
  // `globalThis.crypto.getRandomValues` works in:
  //   - Node 18+ (built-in)
  //   - Edge runtime (Vercel Edge, Cloudflare Workers)
  //   - Modern browsers (used here only in dev/tests, never in production runtime)
  globalThis.crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

/** Exported for tests — internal constants. */
export const __testing__ = {
  NONCE_BYTES,
  bytesToBase64,
};
