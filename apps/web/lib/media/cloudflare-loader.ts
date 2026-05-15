// ═══════════════════════════════════════════════════════════════
// CLOUDFLARE IMAGE LOADER — Task #46 Next.js custom image loader
//
// Next.js <Image> component needs a loader to know how to build URLs
// for a given source + requested width + quality. Default loader uses
// Vercel's image optimisation; we replace it with one that builds URLs
// for our Cloudflare Images delivery origin (imagedelivery.net).
//
// Configured in next.config.ts (Phase 5):
//   images: { loader: 'custom', loaderFile: './lib/media/cloudflare-loader.ts' }
//
// URL pattern Cloudflare Images serves:
//   https://imagedelivery.net/<accountHash>/<imageId>/<variantName>
//
// We map Next's `width` parameter to the closest pre-configured variant
// (`thumbnail` 200px, `medium` 640px, `large` 1200px). For widths bigger
// than `large` we still return `large` — Cloudflare will scale up only
// the requested area at the edge if needed. Origin bytes were already
// capped at 1568px by our resize pipeline.
//
// FALLBACK: if `src` is not a CF Images URL (e.g., a relative path to a
// /public asset, or a marketing PNG), we return it unchanged — Next.js
// renders it as-is without optimisation. This keeps the loader safe to
// use globally without breaking existing images.
// ═══════════════════════════════════════════════════════════════

/** Pre-configured variant names + the upper-bound width each represents.
 *  MUST stay in sync with the variants configured in the Cloudflare
 *  dashboard per docs/runbooks/cloudflare-setup.md. */
const VARIANT_WIDTH_THRESHOLDS = [
  { variant: 'thumbnail', maxWidth: 240 },
  { variant: 'medium', maxWidth: 720 },
  { variant: 'large', maxWidth: 9999 },
] as const;

const CF_DELIVERY_HOSTNAME = 'imagedelivery.net';

interface NextImageLoaderArgs {
  readonly src: string;
  readonly width: number;
  readonly quality?: number;
}

/**
 * Default-export the loader function — Next.js calls this with
 * `{ src, width, quality }` for every <Image> render.
 *
 * NOTE: this runs in BOTH server and client contexts. Keep it pure,
 * no side effects, no env lookups that fail at edge / build time.
 */
export default function cloudflareLoader({ src, width }: NextImageLoaderArgs): string {
  // ── Bypass — already-built CF Images URL ───────────────────
  // If the src already has /<accountHash>/<imageId>/<variant>, we may
  // need to swap the variant suffix to match the requested width.
  if (isCfImagesUrl(src)) {
    return swapVariantToMatchWidth(src, width);
  }

  // ── Bypass — non-CF URLs (relative, /public, external CDNs) ──
  // We do not attempt to optimise these; pass through unchanged. The
  // caller is responsible for rendering them as-is.
  return src;
}

// ─── Helpers ──────────────────────────────────────────────────

function isCfImagesUrl(src: string): boolean {
  try {
    const u = new URL(src);
    return u.hostname === CF_DELIVERY_HOSTNAME;
  } catch {
    // Relative URL ("/public/foo.png") — `new URL` throws; not a CF URL.
    return false;
  }
}

/**
 * Given an existing CF Images URL and a requested width, replace the
 * trailing variant segment with the appropriate one. Idempotent — if
 * the URL already targets the correct variant, no change is made.
 *
 * Original: https://imagedelivery.net/<hash>/<id>/medium
 * Target  : https://imagedelivery.net/<hash>/<id>/large
 */
function swapVariantToMatchWidth(src: string, width: number): string {
  const variantForWidth = pickVariantForWidth(width);
  try {
    const u = new URL(src);
    // Path looks like `/<accountHash>/<imageId>/<variant>[?...]`
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 3) {
      // Unexpected shape — return original.
      return src;
    }
    parts[parts.length - 1] = variantForWidth;
    u.pathname = '/' + parts.join('/');
    return u.toString();
  } catch {
    return src;
  }
}

function pickVariantForWidth(width: number): string {
  for (const t of VARIANT_WIDTH_THRESHOLDS) {
    if (width <= t.maxWidth) return t.variant;
  }
  // Defensive fallback — should be unreachable because the last threshold
  // has maxWidth: 9999. Keeping it ensures the return type is always
  // a real variant name even under exotic input.
  return 'large';
}
