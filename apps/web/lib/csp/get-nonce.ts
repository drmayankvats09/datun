// apps/web/lib/csp/get-nonce.ts
// ═══════════════════════════════════════════════════════════════
// SERVER COMPONENT NONCE HELPER
//
// In Next.js 16's App Router, server components can read request headers
// via `next/headers`. Our proxy.ts sets `x-nonce` on the request, and this
// helper pulls it out for use in inline `<script nonce>` tags.
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
//   If `x-nonce` is missing (e.g., static route accidentally calls this,
//   or test environment), we return an empty string and log a warning.
//   The script will then be rejected by CSP, which is correct fail-safe
//   behavior — better to break visibly than silently allow scripts without
//   nonce verification.
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
    // Why a warning, not an error: the layout calls this even on static routes
    // (where there is no nonce). Returning empty string lets the script tag
    // render — and CSP will block it correctly if needed.
    // In production we want this to be silent on static routes (expected).
    // Detection of "should have had nonce but didn't" happens at the CSP
    // violation reporting layer.
    return '';
  }

  return nonce;
}
