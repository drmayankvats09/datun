// ═══════════════════════════════════════════════════════════════
// TRACE ID — Universal correlation ID across producer, queue, worker
//
// Usage:
//   API: const traceId = generateTraceId();
//        await enqueueWhatsApp({ ..., traceId });
//   Worker: receives traceId in payload, logs with it, stores in JobLog.
//
// Format: "trc_" prefix + 16 random hex chars (64 bits entropy).
// Pattern: Stripe req_xxx IDs, Linear request correlation, AWS X-Ray.
//
// TASK #53.5 W2 — Web Crypto migration (CUT-1, −~99KB client JS):
//   This module previously imported `randomBytes` from `node:crypto`.
//   Because it is re-exported by the @repo/shared root barrel — which
//   30+ CLIENT components import for design tokens — Next.js bundled
//   the entire `crypto-browserify` polyfill (98.96KB stat) into the
//   shared client chunk of EVERY page. The treemap named it; this
//   rewrite kills it.
//
//   `globalThis.crypto.getRandomValues` is the isomorphic replacement:
//     - Browsers: native Web Crypto (all evergreen, IE excluded — fine)
//     - Edge runtime: native (Node built-ins are unavailable there
//       anyway, so this ALSO fixes a latent edge-runtime crash)
//     - Node.js: global `crypto` is available since v19 and stable on
//       the v20/v22 LTS lines we deploy on Railway (@types/node ^22).
//     - Web Workers / BullMQ workers: native.
//
//   Entropy is identical to before: 8 random bytes → 16 hex chars
//   = 64 bits (the original header's "96 bits" was a miscount — the
//   old `randomBytes(TRACE_ID_LEN / 2)` also produced 8 bytes).
//   64 bits is ample for correlation IDs — these are NOT security
//   tokens; at 1M IDs/day the yearly collision odds are ~1 in 10^8,
//   the same order Stripe-class request IDs operate at.
//
//   ZERO call-site changes: same exports, same signatures, same
//   output format. `apps/api/src/lib/queue/producers.ts` and every
//   existing test keep working untouched.
// ═══════════════════════════════════════════════════════════════

const TRACE_ID_LEN = 16; // hex chars after "trc_" prefix

/**
 * Minimal structural view of the Web Crypto surface this module
 * needs. Declared LOCALLY — deliberately not the ambient `Crypto`
 * type — because that name lives in lib.dom.d.ts and this package
 * is compiled by FOUR different tsconfigs: apps/web (has "dom"),
 * apps/api + apps/worker (Node-only, NO "dom"), and edge. An
 * isomorphic shared module must be lib-agnostic: referencing any
 * ambient platform type couples it to whichever consumer happens
 * to include that lib (Task #53.5 W2 hotfix — worker's tsc threw
 * TS2304 "Cannot find name 'Crypto'" on exactly this coupling).
 */
interface WebCryptoLike {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}

/**
 * Resolve the Web Crypto implementation for the current runtime.
 *
 * Throws loudly (never silently degrades to Math.random) if Web
 * Crypto is genuinely absent — correlation IDs feed observability
 * joins across API ↔ queue ↔ worker; silent low-entropy fallback
 * would produce hard-to-debug ID collisions, which is worse than a
 * crash at startup on an unsupported runtime.
 */
function getCrypto(): WebCryptoLike {
  const c = (globalThis as { crypto?: WebCryptoLike }).crypto;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error(
      '[trace] Web Crypto unavailable in this runtime. ' +
        'Node ≥ 20, modern browsers, and edge runtimes all provide ' +
        'globalThis.crypto — check your execution environment.',
    );
  }
  return c;
}

export function generateTraceId(): string {
  const bytes = new Uint8Array(TRACE_ID_LEN / 2);
  getCrypto().getRandomValues(bytes);
  let hex = '';
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, '0');
  }
  return `trc_${hex}`;
}

export function isValidTraceId(value: unknown): value is string {
  return typeof value === 'string' && /^trc_[a-f0-9]{16}$/.test(value);
}
