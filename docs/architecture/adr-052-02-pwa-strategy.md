# ADR-052-02 — PWA Strategy

**Status:** Accepted (scope-limited)
**Date:** 22 May 2026
**Author:** Mayank Vats (CEO/CTO) — Task #52
**Related:** Future Task #214 (full PWA expansion)

---

## Context

Datun targets 600M+ underserved Indians who:

- Have entry-level Android phones with limited storage.
- Connect over patchy 3G/4G with frequent drops.
- Often install apps via PWA "Add to Home Screen" rather than the Play Store (storage + bandwidth constraints).

A 2024 survey by Google India found 51% of Indian mobile users had encountered the "white screen on network drop" failure mode at least weekly. For a healthcare app, this is the worst possible UX — users abandon mid-consultation and don't come back.

Task #52 sets the **minimum viable PWA foundation**. Full PWA features (background sync, push notifications, asset precaching pipelines, install prompts) are out of scope and belong to Future Task #214.

---

## Decisions

### 1. **Minimum PWA scope for Phase 5**

Phase 5 ships:

- `/public/sw.js` — hand-rolled service worker
- `/public/manifest.json` — PWA install metadata
- `/lib/sw/register.ts` — registration helper
- `/[locale]/offline/page.tsx` — dynamic offline page (Phase 3)
- Cache headers in `next.config.ts` for SW + manifest + offline

Phase 5 does **NOT** ship:

- Background sync for offline mutations
- Push notifications (separate Task #154+)
- Asset precaching pipeline (full SPA cache)
- Custom install prompt UI
- Periodic background sync

### 2. **Manual service worker, not Workbox**

A hand-rolled ~300-line SW at `/public/sw.js` instead of Workbox / Serwist / next-pwa.

**Why:**

- **Turbopack incompatibility** — Next.js 16's default bundler is Turbopack. Workbox/Serwist/next-pwa all hook into webpack's lifecycle (`compilation.hooks.afterEmit`, etc.) which Turbopack doesn't expose. They literally don't work.
- **Narrow scope** — Phase 5's only SW responsibility is "serve offline.html when network fails for navigation". 300 lines is enough; Workbox's value is in precaching pipelines we don't need yet.
- **Maintainability** — a single dev can read the entire SW in 10 minutes. Workbox is 200KB of behaviour requiring its own learning curve.
- **Forward path** — when Future Task #214 expands PWA, we can either grow this file or migrate to a library at that point. The interface (a function `registerServiceWorker()` returning a registration) is library-agnostic.

**Rejected alternative:** Switch the build system to webpack to use Workbox. Rejected because Turbopack gives us 4× faster local dev builds; that's a much bigger win than convenient PWA library usage.

### 3. **Caching strategies by request type**

```
Navigation (HTML)      → Network-first, /offline.html fallback
Static (_next/static)  → Cache-first (content-hashed → safe long-term)
API GET                → Network-first, NO cache (medical data freshness)
Same-origin GET other  → Cache-first
Cross-origin           → Pass-through (browser default)
Non-GET                → Pass-through (no SW involvement)
```

**Why:**

- HTML responses contain user-specific data (auth state, consultation IDs). Caching would create stale-state bugs.
- Static assets have content-hashed filenames (Next.js's default). They NEVER change once cached — long-lived cache is safe.
- API GETs (medical data) MUST be fresh. The SW's synthetic 503 response on network failure cleanly hooks into TanStack Query's network-error category, which triggers the boundary's "Try again" UI.
- POST/PATCH/DELETE bypass the SW entirely. Queuing mutations in a service worker for retry-on-reconnect introduces data-loss risk (uninstall, browser crash) and complex de-dupe logic. Defer to a proper background-sync implementation in Task #214.

**Rejected alternative:** Stale-while-revalidate for everything. Rejected for medical data — a doctor seeing stale lab values for 5 seconds while SWR runs is a safety incident.

### 4. **`updateViaCache: 'none'` + `Cache-Control: no-store` on `/sw.js`**

The SW script bypasses the HTTP cache entirely.

**Why:**

- Browsers detect SW updates by byte-comparing the freshly-fetched script. If the script is HTTP-cached for 24h, an urgent fix is delayed 24h.
- `updateViaCache: 'none'` (set in `lib/sw/register.ts`) forces the browser to bypass its HTTP cache when checking for SW updates.
- `Cache-Control: no-store` (set in `next.config.ts` headers) tells every CDN and proxy in the chain to NEVER cache the SW.

Combined cost: ~200 bytes / page load (one cheap HEAD-shaped request). Cheaper than a single Sentry event.

### 5. **`skipWaiting()` NOT auto-called**

The SW deliberately does NOT call `self.skipWaiting()` on install.

**Why:**

- Calling `skipWaiting()` makes the new SW active immediately, replacing the old one MID-PAGE. If the user is in the middle of a consultation, the underlying assets they're loading change versions under their feet — visible bugs.
- Industry practice (Stripe, Linear, Vercel): show an "Update available — reload to apply" toast and let the user opt-in. We expose a `promoteWaitingServiceWorker()` helper for that toast (wired in Future Task #214).
- The current behaviour — new SW becomes active on the NEXT full reload — matches user expectations of "the page I'm using doesn't change versions under me".

### 6. **Manifest minimum viable**

The manifest declares: name, short_name, description, start_url, scope, display=standalone, brand colors, 4 icons (192/512 × any/maskable), and 1 shortcut (Start consultation).

What's deliberately NOT declared:

- `share_target` — Future Task #150 (let users share photos to Datun from camera roll)
- `protocol_handlers` — Future Task (deep linking from SMS)
- `file_handlers` — Future Task (X-ray DICOM file association)
- `widgets` — Future Task (lock-screen consultation summary on Pixel/iOS)

**Why:** Each declared field is a maintenance commitment. We declare only what we ship behaviour for in Phase 5.

---

## Consequences

**Positive:**

- Indian rural users on dropped connections see a useful offline page instead of a browser error.
- Foundation laid for Task #214 — `registerServiceWorker()` interface, manifest, cache headers all in place.
- The SW caches static assets aggressively → repeat visits feel near-instant on slow networks.

**Negative:**

- The hand-rolled SW will need to be rewritten or replaced when Task #214 adds background sync. Acceptable because that's a planned migration, not a surprise.
- No precaching of the app shell — first paint on slow networks still hits the network. Acceptable for Phase 5; precaching belongs to Task #214's offline-first work.
- Service workers add a class of "stale SW" bugs that don't exist without one. Mitigated by the dev-mode auto-unregister behaviour in `lib/sw/register.ts`.

**Neutral:**

- The SW adds ~6 KB of JS to the SW worker bundle (NOT the page bundle — the SW is separate). No impact on page load metrics.

---

## Out-of-Scope (deferred to Future Task #214)

- IndexedDB cache of consultation drafts for offline-compose
- Background sync for queued mutations on reconnect
- Push notifications (appointment reminders, follow-ups)
- Web App Install prompt with PostHog tracking
- Asset precaching pipeline (full SPA-style offline)
- Periodic background sync (refresh consultation list while phone is idle)
- Share Target API integration (let users share photos from camera roll)
- Cross-tab SW lifecycle coordination
- Workbox migration if the manual SW outgrows its current scope

---

## References

- web.dev — Progressive Web Apps: https://web.dev/explore/progressive-web-apps
- Next.js PWA guide: https://nextjs.org/docs/app/guides/progressive-web-apps
- Workbox vs hand-rolled SW comparison: https://web.dev/learn/pwa/serving (2024 update)
- Google India Mobile Internet Report 2024 (network drop frequency stats)
- Turbopack + Workbox incompatibility tracker: https://github.com/vercel/next.js/issues/76822 (closed wontfix)
