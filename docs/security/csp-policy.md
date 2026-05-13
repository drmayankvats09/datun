# Content Security Policy (CSP) — Engineering Reference

**Audience:** Engineers contributing to Datun.
**Status:** Active (Task #45, Day 16+ of v2 sprint).
**Last reviewed:** May 13, 2026.

This document is the canonical engineering reference for Datun's Content Security Policy. It describes the architecture, the rationale behind each design decision, and how to extend the policy safely.

## Why CSP

Cross-site scripting (XSS) remains the most common high-severity web vulnerability for SaaS platforms handling personal data. For a healthcare platform subject to the Digital Personal Data Protection Act 2023, an unmitigated XSS vector can lead to:

- Patient record exfiltration and a ₹250 crore penalty under DPDP Section 8(5).
- Session-token theft enabling impersonation across the clinic and admin surfaces.
- Magecart-style supply-chain compromises through any of the third-party scripts the application loads.

CSP, when configured strictly, blocks the script execution that these attack chains depend on, even when application-level input sanitization fails.

## Architecture Overview

Datun uses a **hybrid CSP**:

| Route Class                                                           | CSP Mechanism               | Rendering Mode      |
| --------------------------------------------------------------------- | --------------------------- | ------------------- |
| Static pages (`/`, locale roots, legal pages)                         | Hash-based (`'sha256-...'`) | SSG, edge-cacheable |
| Dynamic pages (`/(auth)/*`, `/consult/*`, `/admin/*`, OAuth callback) | Nonce-based (`'nonce-...'`) | SSR per request     |

The decision of which mechanism applies to a given route is made by `apps/web/lib/csp/route-classification.ts`. New routes default to **dynamic** (the safer choice).

Both mechanisms share a common builder (`apps/web/lib/csp/policy.ts`) and a single source of truth for allowed origins (`apps/web/lib/csp/allowed-origins.ts`).

## Header Composition

Every response carries:

1. `Content-Security-Policy` (enforce mode) or `Content-Security-Policy-Report-Only` (initial rollout / staging).
2. `Reporting-Endpoints: csp-endpoint="https://api.datunai.com/api/security/csp-report"`.
3. `Cross-Origin-Opener-Policy: same-origin`.
4. `Cross-Origin-Resource-Policy: same-origin` (API responses only).
5. `Strict-Transport-Security` (configured via Helmet on the API and via Vercel on the web).

Refer to `apps/web/proxy.ts` for the precise set-up of dynamic-route headers and `apps/web/next.config.ts` for static-route headers.

## How to Add a New Third-Party Origin

When integrating a new vendor whose script or API must be reachable from the browser, add it to `apps/web/lib/csp/allowed-origins.ts` under the relevant category:

- `SCRIPT_ORIGINS` — vendors that load executable JavaScript.
- `STYLE_ORIGINS` — vendors that load stylesheets.
- `FONT_ORIGINS` — vendors that serve font files.
- `IMG_ORIGINS` — image hosts.
- `CONNECT_ORIGINS` — endpoints to which the browser makes `fetch` / `XMLHttpRequest` calls.
- `FRAME_ORIGINS` — embeddable iframe sources (payment widgets, OAuth popups).

Group each addition by vendor name. Where possible, prefer exact hostnames over wildcards. Where a wildcard is unavoidable (for example, `https://*.ingest.sentry.io`), restrict it to a specific second-level domain.

For pre-staged origins (already listed but commented out for an upcoming task), follow the existing `// ── Pre-staged for Task #...` annotations. Uncomment only when the corresponding task ships.

After modification, run:

```bash
pnpm --filter web run test apps/web/__tests__/lib/csp
```

The invariant tests will fail if any new entry uses `http://`, a bare wildcard, or localhost.

## Strict-Dynamic and Host Allowlists

The script-src directive uses `'strict-dynamic'`. Per the CSP Level 3 specification, modern browsers (Chrome 73+, Firefox 68+, Safari 15.4+, Edge 79+) ignore explicit hostnames in `script-src` when `'strict-dynamic'` is present. They rely on the nonce or hash alone to authorize the initial script, then transitively trust scripts loaded from that script.

Legacy host entries are retained for browsers that do not implement Level 3. These act as a graceful-degradation fallback and impose no risk on modern clients.

## Debugging CSP Violations Locally

1. Run the web app in development mode:

```bash
   pnpm --filter web run dev
```

2. Open the browser's developer tools, navigate to the page in question, and inspect the Console. CSP violations appear as red warnings with the violated directive and the blocked URI.

3. To see what the server is emitting, inspect the response headers in the Network panel. Look for `Content-Security-Policy` (or the report-only variant).

4. For a structured view of recent violations from real traffic, navigate to `/{locale}/admin/security` (requires the `ADMIN` or `OWNER` role).

## Reporting Pipeline

Browsers POST violations to `POST /api/security/csp-report`. The pipeline:

1. Rate-limited per IP (100 reports per minute).
2. Validated against either the legacy CSP Level 2 schema or the modern Reporting API schema.
3. Normalized into a single internal shape.
4. Deduplicated against an in-memory LRU cache keyed by `ipHash | blockedUri | effectiveDirective` with a 1-hour TTL.
5. Persisted to the `csp_violations` PostgreSQL table.
6. Critical-severity violations (`script-src` and variants) raise a Sentry alert.

The IP address is never stored in plain form. It is hashed with `SHA-256(ip || env.CSP_IP_HASH_SALT)` before persistence, satisfying the DPDP Act's data-minimization requirement.

## Related Files

- `apps/web/lib/csp/` — all client-side CSP machinery.
- `apps/web/proxy.ts` — per-request CSP injection.
- `apps/web/next.config.ts` — static-page CSP and other security headers.
- `apps/api/src/routes/security/csp-report.router.ts` — reporting endpoint.
- `apps/api/src/services/csp-report.service.ts` — validation and persistence.
- `packages/db/prisma/schema.prisma` — `CspViolation` model.
- `docs/security/csp-rollout-runbook.md` — phased deployment runbook.
- `docs/security/csp-third-party-vendors.md` — per-vendor inventory and rationale.
- `docs/runbooks/csp-violation-spike.md` — on-call response to violation spikes.
- `docs/adr/0004-strict-csp-hybrid-nonce-hash.md` — architecture decision record.
