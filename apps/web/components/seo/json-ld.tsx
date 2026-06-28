// apps/web/components/seo/json-ld.tsx
// ═══════════════════════════════════════════════════════════════
// <JsonLd> — server-only structured-data emitter (Task #55, Section C).
//
// Renders a single <script type="application/ld+json"> carrying the per-request
// CSP nonce (the app runs a strict-dynamic CSP). One component for the whole
// site: the locale layout emits the global Organization + WebSite graph on every
// route, and each page adds its page-specific nodes (WebPage / FAQPage /
// BreadcrumbList) — all built by @repo/shared's schema factory.
//
// suppressHydrationWarning: React strips `nonce` from the client tree for
// security, so SSR vs client differ on this attribute. The payload is
// non-executable JSON data (never user HTML — JSON.stringify of trusted,
// page-derived objects), so the difference is expected and safe.
// ═══════════════════════════════════════════════════════════════

import { getNonce } from '@/lib/csp/get-nonce';

/** Emit a JSON-LD graph (a plain object from the schema factory) as a nonce'd
 *  <script>. Server component — reads the nonce from the request itself, so
 *  callers just pass `data`. */
export async function JsonLd({ data }: { data: unknown }) {
  const nonce = await getNonce();
  return (
    <script
      type="application/ld+json"
      nonce={nonce || undefined}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
