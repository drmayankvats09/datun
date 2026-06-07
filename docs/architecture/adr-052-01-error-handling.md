# ADR-052-01 — Error Handling Architecture

**Status:** Accepted
**Date:** 22 May 2026
**Author:** Mayank Vats (CEO/CTO) — Task #52
**Supersedes:** None (greenfield)

---

## Context

Datun is a healthcare application for 600M+ underserved Indians, accessed primarily on patchy 3G/4G networks. The frontend must:

1. **Stay usable when things break** — a white-screen-of-death (WSOD) on a medical question costs trust + lives.
2. **Produce legal-evidence trails** — DPDP Act 2023 + future HIPAA require immutable audit logs for every user-impacting failure.
3. **Recover gracefully** — auto-retry transient failures (rural network drops), guide the user when retry won't help.
4. **Stay performant** — Indian users on entry-level Android phones; every kilobyte of error UI matters.

Before Task #52, Datun's error handling consisted of:

- A single generic React `ErrorBoundary` class component (`apps/web/components/a11y/error-boundary.tsx`) that called `window.location.reload()` on retry — losing in-memory state.
- A basic `app/[locale]/error.tsx` with inline UI and ad-hoc Sentry capture.
- A basic `app/[locale]/not-found.tsx` with a single "Return home" button.
- No audit logging — Sentry events expire (90-day retention), there was no permanent error record.
- No offline support — users on dropped connections saw white screens.
- PII (email, name, phone) was being leaked into Sentry user context.

This ADR records the decisions that shaped the Task #52 redesign.

---

## Decisions

### 1. **Discriminated error categories** (Phase 1)

Every thrown value is categorised by a pure function (`lib/errors/categorize.ts`) into one of 10 stable categories: `network`, `auth`, `validation`, `rate-limit`, `not-found`, `server`, `ai-service`, `consultation-state`, `chunk-load`, `unknown`.

**Why:**

- UI decisions ("retry" vs "sign in again" vs "reload") become deterministic.
- Sentry filtering by `error.category` tag lets us triage 10 buckets instead of N thousand fingerprints.
- Adding a new category forces an update in 5 well-defined places (categorize, recovery, locale JSONs, components, tests) — compile-time exhaustiveness checks via `assertNever` enforce this.

**Rejected alternative:** Use raw `error.name` (`TypeError`, `NetworkError`, etc.) for branching. Rejected because that explodes to hundreds of unique values and doesn't capture Datun-specific cases like `CONSULTATION_EXPIRED`.

### 2. **Three-layer boundary architecture** (Phase 2)

```
App Boundary (level="app")
└── Route Boundary (level="route", per Next.js error.tsx)
    └── Feature Boundary (level="feature", per FeatureBoundary)
        └── Widget Boundary (level="widget", default)
```

**Why:**

- A crash in a single widget (e.g., chat panel) doesn't take down the whole consultation page.
- The Route boundary keeps the layout/nav intact so users can pivot to another section.
- The App boundary is the last-resort net for layout-itself crashes.

**Rejected alternative:** Use only Next.js's per-segment `error.tsx` files. Rejected because that gives no granularity finer than a route segment; widget-level crashes either propagate to the segment boundary (losing the whole page) or get swallowed silently (worse).

### 3. **PII-safe Sentry user context** (Phase 1, 5)

`SentryUserContext` component applies ONLY `{id, role}` to Sentry — never `email`, `name`, `phone`, or `avatarUrl`.

**Why:**

- DPDP Act Section 8(3) — data minimisation.
- HIPAA Security Rule §164.514 — de-identification standard.
- Single point of enforcement — code review catches PII leaks at this one file instead of every Sentry call site.

### 4. **Owned audit endpoint** (Phase 1, 5)

Errors caught by boundaries POST to `/api/audit/error`, which writes to Prisma's `AuditLog` table.

**Why:**

- Sentry events are vendor-owned + expire. Audit logs are legal evidence and must be ours, permanently.
- The frontend uses `navigator.sendBeacon` so the request survives page unloads — users who close the tab after seeing an error still produce an audit row.
- Anonymous-friendly (`optionalAuth`) — auth-broken sessions are exactly when we most need audit data; demanding a token would create a blind spot.

**Rejected alternative:** Sync Sentry events to a long-term store via Sentry's webhook. Rejected because it couples our audit trail to Sentry's webhook reliability and adds a third-party in the compliance loop.

### 5. **Exponential backoff with full jitter** (Phase 1)

Retries use `min(maxDelay, baseDelay × 2^attempt)` with random `[0, delay)` jitter.

**Why:**

- Standard FAANG retry science (Marc Brooker / AWS, 2015) — full jitter avoids thundering herd when many clients retry simultaneously after an upstream recovery.
- Defaults match TanStack Query (`apps/web/lib/query/query-client.ts`) so retries don't double-up between layers.

### 6. **Inline-style fallbacks for app-level crashes** (Phase 2)

The `AppError` component uses ONLY inline styles, hardcoded brand colors, and English copy.

**Why:**

- When the root layout crashes, CSS variables, Tailwind context, fonts, and i18n are all potentially unavailable.
- Hardcoded `#00A896` (Datun teal) is the only colour guaranteed to render.

### 7. **Manual service worker, not Workbox** (Phase 5)

A hand-rolled ~300-line SW at `/public/sw.js` instead of Workbox / Serwist / next-pwa.

**Why:**

- Turbopack (Next.js 16's default bundler) is incompatible with webpack-based PWA libraries.
- Task #52's PWA scope is narrow (offline fallback only). The full PWA feature set belongs to Future Task #214.
- A maintainer can read the entire SW in 10 minutes. Workbox is 200KB of behaviour the team would need to learn.

**Rejected alternative:** Defer PWA entirely to Task #214. Rejected because the offline page is a core Phase 5 deliverable per the Task #52 PDF specification.

### 8. **Static `404.html` / `500.html` for platform-level crashes** (Phase 5)

Two static HTML files at `/public/404.html` and `/public/500.html` rendered by Vercel when Next.js itself can't respond (function timeout, OOM, edge errors).

**Why:**

- Next.js's `app/global-error.tsx` requires the Next runtime to be alive. When the function itself dies, Vercel serves the platform 404/500.
- Static HTML survives every failure mode. Zero JS, zero CSS dependencies, no fonts.
- Vercel's January 2026 token-replacement feature (`::vercel:REQUEST_ID::`) lets us surface a debuggable reference ID even at this level.

---

## Consequences

**Positive:**

- White-screen-of-death is now structurally impossible. Every failure mode has a planned UI.
- Sentry triage time drops from "search by message" to "filter by category" — order-of-magnitude faster.
- Audit log gives Datun a HIPAA-ready trail before US expansion in 2028+.
- Offline UX works on Indian rural networks — users on dropped 3G see a useful page, not a browser error.
- The categorisation taxonomy is the single source of truth — UI, recovery, audit, and Sentry tags all consume from it.

**Negative:**

- Adding a new error category requires touching 5+ files. Mitigated by `assertNever` exhaustiveness checks.
- The PWA scaffolding (`sw.js`, `manifest.json`) creates a maintenance surface even though Task #52's PWA scope is narrow.
- Inline-styled fallbacks (`AppError`, `404.html`, `500.html`) duplicate the brand palette in 3 places. Acceptable because they're the last-resort UIs — their reliability matters more than DRY.

**Neutral:**

- The frontend now ships ~30 KB more JS (error UI components, illustrations, retry hook). Lighthouse mobile scores unchanged; no perf regression.

---

## References

- DPDP Act 2023, Section 8 (Reasonable Security Safeguards)
- AWS Architecture Blog — "Exponential Backoff And Jitter" (Marc Brooker, 2015)
- Sentry React SDK docs — https://docs.sentry.io/platforms/javascript/guides/react/
- Next.js error handling — https://nextjs.org/docs/app/getting-started/error-handling
- React 19 Error Boundaries — https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- Linear's calm error states (private blog post, 2024)
