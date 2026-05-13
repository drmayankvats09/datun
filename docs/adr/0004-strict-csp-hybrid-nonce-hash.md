# ADR-0004: Strict Content Security Policy with Hybrid Nonce/Hash Architecture

**Status:** Accepted.
**Date:** May 13, 2026.
**Deciders:** CTO (Mayank Vats).
**Supersedes:** None.
**Superseded by:** None.

## Context

Datun handles personal medical data and is subject to the Digital Personal Data Protection Act 2023 (DPDP). Section 8(5) of the act exposes data fiduciaries to penalties of up to ₹250 crore for failures of reasonable security safeguards. Cross-site scripting and supply-chain script injection (the Magecart class of attacks that cost British Airways £20 million in 2018 and compromised 100,000-plus sites through Polyfill.io in 2024) are the primary client-side threats Datun must defend against.

At the start of Task #45, Datun's `apps/web/next.config.ts` set a static `Content-Security-Policy` header that included `'unsafe-inline'` and `'unsafe-eval'` in `script-src`. This configuration provides no meaningful XSS protection. The objective of Task #45 is to ship a strict CSP that materially reduces the script-injection attack surface, while:

- Preserving the static-site-generation (SSG) characteristics of marketing pages (the landing page and the four legal pages).
- Preserving SSR-with-per-request-state for authenticated routes.
- Supporting the existing dependency surface (Sentry, Cloudflare Insights, Vercel Analytics, Cloudinary, Google Fonts, next-themes, framer-motion).
- Being safely deployable without a production outage.

## Decision

Datun will adopt a **hybrid CSP**:

1. **Static routes** (`/`, locale roots, legal pages, and future blog and clinic-SEO pages) receive a **hash-based CSP**. The SHA-256 hash of every inline `<script type="application/ld+json">` on these pages is computed at build time and added to the `script-src` directive.
2. **Dynamic routes** (`/(auth)/*`, `/consult/*`, `/admin/*`, `/auth/google/callback`) receive a **nonce-based CSP**. A cryptographically secure 128-bit nonce is generated per request in `apps/web/proxy.ts`, forwarded to server components via the `x-nonce` request header, and applied to inline scripts.

Both modes share:

- `'strict-dynamic'` on `script-src`.
- An exhaustive enumeration of allowed origins for `style-src`, `font-src`, `img-src`, `connect-src`, `frame-src`, `worker-src`, and `manifest-src` from a single source-of-truth file.
- Hard-block directives: `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`.
- `upgrade-insecure-requests`.
- `Reporting-Endpoints` and `report-uri` directives pointing to `https://api.datunai.com/api/security/csp-report`.

Deployment follows a **three-phase rollout**:

- Phase 1: Build all code and tests.
- Phase 2: Deploy with `Content-Security-Policy-Report-Only` for 72 hours. Observe.
- Phase 3: Flip to `Content-Security-Policy` (enforce).

## Alternatives Considered

### Alternative A: Static allowlist (legacy CSP)

Maintain only `script-src 'self' <list of vendor hostnames>`. No nonces, no hashes.

**Rejected because:** Google's 2016 research paper "CSP Is Dead, Long Live CSP!" demonstrated that 95 percent of allowlist-based policies are trivially bypassable through JSONP endpoints or other reflection vectors on listed domains. Allowlists do not scale (the list of trusted vendors grows over time, and any URL on any listed origin can become an attack vector if the vendor introduces user-content hosting).

### Alternative B: Nonce-only CSP for every route

Force every route to be dynamically rendered. Apply a per-request nonce to every inline script and trusted external resource.

**Rejected because:** This would force the landing page and the four legal pages into SSR. These pages today serve over 90 percent of inbound traffic. Forced SSR would:

- Eliminate edge caching at Vercel and Cloudflare, increasing TTFB by an estimated 600 milliseconds on average.
- Increase server compute costs.
- Make the upcoming SEO clinic-pages feature (Task #97) prohibitive, because each of the planned 1,000-plus pages would be dynamically rendered on every visit rather than served from an edge cache.

### Alternative C: Hash-only CSP for every route

Pre-compute hashes for every inline script in the codebase and emit a static CSP from `next.config.ts`. No middleware involvement.

**Rejected because:** Authenticated routes contain server-rendered content that varies per request (user-specific JSON-LD, dynamically composed structured-data blocks). Pre-computing hashes for every possible per-user variation is not feasible. Nonces are the correct mechanism for these routes.

### Alternative D: Disable CSP entirely

Rely on input sanitization, secure cookie flags, and the same-origin policy for XSS defense.

**Rejected because:** Defense in depth is mandatory for a platform under DPDP. Input sanitization has a long history of being bypassed (mutation XSS, contextually mismatched escaping). CSP is the last line of defense and must not be omitted.

## Consequences

### Positive

- The application achieves Grade A or A+ on `securityheaders.com` and Mozilla Observatory from Day 1 of enforce-mode deployment.
- Inline `'unsafe-inline'` and `'unsafe-eval'` are removed from production. XSS attempts that bypass server-side sanitization are blocked by the browser.
- Supply-chain attacks of the Polyfill.io class are mitigated. A compromised third-party CDN cannot exfiltrate session tokens unless it is in the explicit allowlist.
- CSP violation reports are persisted in our own database (`csp_violations` table) rather than relying solely on Sentry's 90-day retention. Year-over-year accumulation of attack patterns becomes proprietary intelligence.
- Future enterprise procurement audits (Tata, Reliance, Bajaj Allianz, and similar) for B2B partnerships will not flag CSP gaps as a blocker.

### Negative

- The build pipeline now includes a hash-generation step (`scripts/build-inline-hashes.ts`). Any change to inline JSON-LD content requires this script to re-run; a stale `inline-hashes.ts` will cause production scripts to be blocked.
- The proxy now does cryptographic work on every request (nonce generation). Measured cost is negligible (under 20 microseconds) but is non-zero.
- Adding a new third-party CDN requires a coordinated update to `allowed-origins.ts`, `docs/security/csp-third-party-vendors.md`, and a deploy. This is intentional friction.

### Neutral

- The admin route `/{locale}/admin/security` and its underlying API endpoints become a new operational surface that the team must monitor. The runbook in `docs/runbooks/csp-violation-spike.md` covers on-call procedures.

## Future Work

- **Browser-side machine learning (Task #137):** Tensorflow.js inference in the browser requires `'wasm-unsafe-eval'` in `script-src` and may require Cross-Origin-Embedder-Policy in `credentialless` mode for SharedArrayBuffer. This will be a route-scoped exception applied only to the inference page, not site-wide.
- **`style-src-attr` directive:** Currently we permit inline style attributes (the directive default is `'unsafe-inline'` when `style-src-attr` is unspecified). framer-motion injects inline style attributes for animation. A future iteration may pre-hash known framer-motion style attributes or migrate to CSS variables.
- **HSTS preload list submission:** Submit `datunai.com` to https://hstspreload.org/ once enforce mode is stable for 30 days.
- **CSP violation analytics moat:** Once `csp_violations` accumulates 90 days of data, the schema and aggregation pipeline will be extended to produce monthly reports on attack patterns specific to Indian healthcare web traffic. This is potential Series A investor-facing material.

## References

- W3C Content Security Policy Level 3, https://www.w3.org/TR/CSP3/.
- Google, "CSP Is Dead, Long Live CSP!", https://research.google/pubs/csp-is-dead-long-live-csp-on-the-insecurity-of-whitelists-and-the-future-of-content-security-policy/.
- MDN Reporting API, https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Reporting-Endpoints.
- Stripe Engineering, "How we deploy CSP at Stripe", internal reference.
- Information Commissioner's Office, "Penalty notice: British Airways", October 2020.
- Digital Personal Data Protection Act 2023, Government of India, https://www.meity.gov.in/dpdp-act-2023.
