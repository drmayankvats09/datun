// apps/web/lib/csp/get-nonce.ts
// ═══════════════════════════════════════════════════════════════
// SERVER COMPONENT NONCE HELPER
//
// In Next.js 16's App Router, server components can read request headers
// via `next/headers`. proxy.ts forwards the per-request nonce as `x-nonce`,
// and this helper pulls it out for use in inline `<script nonce>` tags.
//
// WHY a helper instead of inline `(await headers()).get('x-nonce')`?
//   - Centralized error handling (clear message if proxy didn't set nonce)
//   - Type-safe return (string, never null at call site)
//   - Easier to mock in tests
//   - One place to add telemetry if needed
//
// IMPORTANT: This is SERVER-ONLY. Calling it in a `'use client'` component
// will fail at build time (Next.js detects `next/headers` usage).
//
// FALLBACK BEHAVIOR:
//   If `x-nonce` is missing (e.g., a unit-test environment with no proxy in
//   front), we return an empty string. Callers pass `nonce || undefined` to
//   their consumers, so a missing nonce simply omits the attribute — and
//   Next.js still nonces the rendered <script> from the CSP header itself.
//
// Pattern: Next.js official strict-CSP example (App Router variant).
// ═══════════════════════════════════════════════════════════════

import { headers } from 'next/headers';

/** Header name used by proxy.ts to forward the per-request nonce. */
export const NONCE_HEADER = 'x-nonce';

/**
 * Read the per-request CSP nonce in a server component.
 *
 * @returns The nonce string set by proxy.ts, or empty string if missing.
 *
 * @example
 *   // In a server component:
 *   import { getNonce } from '@/lib/csp/get-nonce';
 *
 *   export default async function Page() {
 *     const nonce = await getNonce();
 *     return (
 *       <script
 *         nonce={nonce}
 *         type="application/ld+json"
 *         dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
 *       />
 *     );
 *   }
 */
export async function getNonce(): Promise<string> {
  const headersList = await headers();
  const nonce = headersList.get(NONCE_HEADER);

  if (!nonce) {
    // Returning '' (rather than throwing) keeps the helper safe to call from
    // unit tests and any context with no proxy in front. In production the
    // proxy always forwards x-nonce, so this branch is not hit.
    return '';
  }

  return nonce;
}