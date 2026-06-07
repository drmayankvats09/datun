// apps/web/public/sw.js
// ═══════════════════════════════════════════════════════════════
// SERVICE WORKER — Task #52 Phase 5 (PWA Foundation)
//
// Minimal hand-rolled SW. We deliberately AVOID Workbox / Serwist /
// next-pwa because:
//   1. Turbopack (Next.js 16's default) is incompatible with the
//      webpack-based PWA libraries — they assume webpack lifecycle
//      hooks that don't exist in Turbopack.
//   2. The full PWA feature set (background sync, push notifications,
//      asset precaching pipelines) belongs to Future Task #214.
//      Task #52 ships only what's needed for the OFFLINE PAGE.
//   3. This SW is ~300 lines — a maintainer can read the entire file
//      in 10 minutes. Workbox alone is 200KB of behavior nobody on
//      the team has time to learn for a 50-line problem.
//
// Strategy:
//   - HTML navigation requests → Network-first with offline fallback
//   - Static assets (Next.js _next/static) → Cache-first (long TTL)
//   - API GET requests        → Network-first (NO caching — medical
//                                data must be fresh)
//   - Everything else         → Pass-through (no SW involvement)
//
// Cache versioning:
//   The cache name embeds an explicit version — `datun-v1`. When we
//   bump this version (Task #52.x or beyond), old caches purge in
//   `activate`. The fastest "force user to refresh" mechanism for
//   us is to bump the version.
//
// Activation strategy:
//   - On `install` — pre-cache /offline.html (the static fallback)
//   - On `activate` — purge OLD cache versions, claim clients
//   - skipWaiting() is INTENTIONALLY OMITTED — we don't want a
//     refresh to mid-conversation update the SW under the user's
//     feet. The SW becomes active on the NEXT full reload. The
//     "update available" toast pattern (Phase 5.x or later)
//     gives the user control.
//
// Cross-origin requests:
//   The fetch handler responds ONLY to same-origin GET requests.
//   POST/PATCH/DELETE always pass through to the network — never
//   queue mutations in a service worker (data loss risk on
//   uninstall, complexity of de-dupe).
//
// References:
//   - https://web.dev/learn/pwa/service-workers
//   - https://developer.chrome.com/docs/workbox/caching-strategies-overview
//   - https://nextjs.org/docs/app/guides/progressive-web-apps
// ═══════════════════════════════════════════════════════════════

const CACHE_VERSION = 'datun-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = '/offline.html';

// ─── Static assets to pre-cache on install ────────────────────
//
// We pre-cache ONLY the offline fallback. Pre-caching the app shell
// (HTML, CSS bundles) is tempting but creates a stale-version
// problem: a user who hasn't reloaded for a week loads the cached
// shell with API calls that mismatch the new backend contract.
//
// Network-first for HTML keeps the app's TLS-fresh state correct;
// the SW only steps in when the network IS unreachable.
const PRECACHE_URLS = [OFFLINE_URL];

// ─── Install — pre-cache the offline page ─────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Use { cache: 'reload' } so we fetch a fresh /offline.html
      // from the network, bypassing any older browser HTTP cache.
      await cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })));
    })(),
  );
});

// ─── Activate — purge old cache versions ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('datun-') && !name.startsWith(CACHE_VERSION))
          .map((name) => caches.delete(name)),
      );
      // Take control of any uncontrolled clients so the SW handles
      // navigations immediately (rather than only after the next
      // reload).
      await self.clients.claim();
    })(),
  );
});

// ─── Fetch — route requests by type ───────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── Same-origin filter — never touch third-party requests ──
  // (Sentry, PostHog, Google Fonts, Cloudflare Images, etc. must
  // ALL pass through untouched).
  if (url.origin !== self.location.origin) return;

  // ── Methods other than GET pass through ──
  if (request.method !== 'GET') return;

  // ── Navigation requests (HTML) — network-first with offline fallback ──
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // ── Static assets (_next/static, images, fonts) — cache-first ──
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // ── API GET (read-only data) — network-first, NO cache ──
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiGet(request));
    return;
  }

  // Anything else — pass-through (browser default fetch behaviour)
});

// ─── Strategy implementations ─────────────────────────────────

/**
 * Network-first navigation. On network failure, fall back to the
 * pre-cached `/offline.html`. We DO NOT cache successful HTML
 * responses — they often contain user-specific data (consultations,
 * auth state) and caching would create a stale-state bug.
 */
async function handleNavigation(request) {
  try {
    const networkResponse = await fetch(request);
    // Network-first: return whatever the network gave us, even error
    // pages (404, 500). The Next.js error.tsx / not-found.tsx files
    // already handle those — we don't replace them with the SW.
    return networkResponse;
  } catch {
    // Network failure → offline fallback.
    const cache = await caches.open(STATIC_CACHE);
    const cachedOffline = await cache.match(OFFLINE_URL);
    if (cachedOffline) return cachedOffline;
    // Cache miss (should not happen — precached on install).
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/**
 * Cache-first for static assets. These have content-hashed filenames
 * (Next.js `_next/static/.../*.<hash>.js`) so they NEVER change once
 * cached — long-lived cache is safe.
 */
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    // Only cache successful, basic-type responses (same-origin).
    if (networkResponse.ok && networkResponse.type === 'basic') {
      // Use .clone() because the body can only be consumed once.
      cache.put(request, networkResponse.clone()).catch(() => {
        // Quota errors etc. — fail silently.
      });
    }
    return networkResponse;
  } catch {
    // Static asset network failure — surface a 503 so the consuming
    // code can fall back gracefully.
    return new Response('Asset unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/**
 * Network-first API GET with NO caching. Medical data must always be
 * fresh — caching would let a doctor see stale labs / consultations.
 * On network failure we surface a synthetic 503 response so the
 * frontend's TanStack Query can categorise it as a network error
 * and the boundary catches it correctly.
 */
async function handleApiGet(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'NETWORK_OFFLINE', message: 'Network unavailable' },
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Detect static asset requests. Next.js places hashed JS/CSS under
 * `_next/static/`. Images and fonts may live anywhere — we identify
 * them by extension.
 */
function isStaticAsset(url) {
  if (url.pathname.startsWith('/_next/static/')) return true;
  if (url.pathname.startsWith('/_next/image')) return true;
  return /\.(?:js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|webp|avif|svg|ico)$/i.test(url.pathname);
}

// ─── Message channel — allow page to instruct SW ──────────────
//
// Currently used for the "skipWaiting" pattern (page tells SW
// to take over immediately after the user clicks "Reload to update").
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
