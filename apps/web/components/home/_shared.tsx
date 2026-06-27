// apps/web/components/home/_shared.tsx
// ═══════════════════════════════════════════════════════════════
// Shared server-safe helpers for the patient-homepage sections (Task #55):
// the section prop type, the locale-aware href helper, the brand wordmark, and
// the per-tile duotone tint. Icons live in ./_icons (client leaves, Phosphor via
// @repo/ui) and are re-exported here so sections keep a single import surface.
// ═══════════════════════════════════════════════════════════════

/** Every section is an async RSC taking the active locale. */
export type SectionProps = { locale: string };

/** Locale-aware internal href (routing is localePrefix: 'as-needed'; en at root). */
export function lp(locale: string, path: string): string {
  return locale === 'en' ? path : `/${locale}${path}`;
}

/** Datun wordmark (brand SVG) — passed to the @repo/ui SiteHeader and reused in
 *  the footer. Theme-aware: ink wordmark on light, off-white on dark. alt=""
 *  because the wrapping links carry their own aria-label. Server-safe. */
export function HomeLogo() {
  // width/height carry the wordmark's intrinsic 4433x1327 ratio (~87x26 at the
  // rendered 26px height) so the header reserves the box before the SVG loads (no CLS).
  return (
    <span className="dtn-wordmark">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="dtn-wordmark__ink"
        src="/brand/datun-wordmark.svg"
        alt=""
        width={87}
        height={26}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="dtn-wordmark__white"
        src="/brand/datun-wordmark-white.svg"
        alt=""
        width={87}
        height={26}
      />
    </span>
  );
}

/**
 * Per-tile duotone tint: a calm, cohesive 3-step cycle through the LOCKED brand
 * ramps (teal -> green -> clay), low-saturation, NOT a rainbow. Drawn from the
 * brand / tertiary / secondary tokens only — never the chart-* data-viz set, and
 * never the off-palette clinical blue the brand deliberately rejects (Design
 * System Part 2.2 / 2.4 + the token-only law, Part 17.14). Drives both the tile
 * icon's currentColor (duotone fg + soft secondary) and the chip background.
 */
const TILE_TINTS = [
  'var(--color-brand-base)', // teal — brand identity (theme-aware)
  'var(--green-600)', // green-teal — in-family tertiary (Part 2.4)
  'var(--color-text-accent)', // clay — warm secondary (theme-aware)
] as const;

export const tileTint = (index: number): string =>
  TILE_TINTS[index % TILE_TINTS.length] ?? 'var(--color-text-link)';

// Icons (client leaves) — single import surface for the sections.
export {
  Shield,
  ShieldCheck,
  Pin,
  Search,
  Lock,
  Chat,
  Report,
  Scale,
  Check,
  Spark,
  Globe,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Star,
  CategoryIcon,
} from './_icons';
