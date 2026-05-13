// apps/web/lib/csp/header-size-guard.ts
// ═══════════════════════════════════════════════════════════════
// CSP HEADER SIZE GUARD — Catches Vercel/Cloudflare 8KB header limit
//
// PROBLEM:
//   Vercel Edge Network silently truncates response headers > ~8KB.
//   Cloudflare similarly enforces ~16KB total. A truncated CSP header is
//   WORSE than no CSP — it silently allows scripts that would have been blocked.
//
// SOLUTION:
//   After buildCspHeader() returns a value, measure UTF-8 byte length:
//     - OK      (< 4096 bytes): no action
//     - WARNING (4096–6144):    log warning
//     - ERROR   (6144–8192):    log error, page Sentry alert
//     - Over 8192:              we never reach (would have errored)
//
// We don't throw on size — would break production for users. We log loudly
// and let proxy.ts emit a clipped fallback policy if extreme.
//
// Pattern: AWS Lambda response size guards, Stripe webhook size limits.
// ═══════════════════════════════════════════════════════════════

/** Size threshold levels — caller decides what action to take. */
export type HeaderSizeLevel = 'ok' | 'warning' | 'error';

/** Maximum recommended size before warning (4 KB). */
export const SIZE_WARNING_BYTES = 4 * 1024;

/** Maximum recommended size before error (6 KB — buffer under 8 KB hard limit). */
export const SIZE_ERROR_BYTES = 6 * 1024;

/** Vercel edge network's hard truncation point (informational). */
export const VERCEL_HARD_LIMIT_BYTES = 8 * 1024;

/**
 * Measure a header value's UTF-8 byte length and classify size level.
 *
 * UTF-8 byte length (not `.length` which counts code units) is what HTTP
 * servers actually transmit. ASCII headers are byte == char, but UTF-8 byte
 * length is the correct invariant.
 *
 * @param headerValue - The full CSP header value string.
 * @returns Size classification (caller decides action).
 */
export function assertHeaderSize(headerValue: string): HeaderSizeLevel {
  const byteLength = getUtf8ByteLength(headerValue);

  if (byteLength >= SIZE_ERROR_BYTES) return 'error';
  if (byteLength >= SIZE_WARNING_BYTES) return 'warning';
  return 'ok';
}

/**
 * Compute UTF-8 byte length of a string.
 *
 * Edge-runtime compatible: uses `TextEncoder` which exists everywhere
 * (Node 18+, browsers, Vercel Edge, Cloudflare Workers).
 */
export function getUtf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}
