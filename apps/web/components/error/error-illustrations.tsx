// apps/web/components/error/error-illustrations.tsx
// ═══════════════════════════════════════════════════════════════
// ERROR ILLUSTRATIONS — Per-category SVGs (Task #52 Phase 2)
//
// Lightweight, hand-crafted inline SVGs — one per error category.
// Inline (not assets) because:
//   1. Zero network requests during an already-degraded experience.
//      An error UI fetching its own illustration would itself fail
//      under the very conditions (network down, server 5xx) where it
//      most needs to render.
//   2. Sized small (currentColor-friendly) so they inherit theme
//      colors and Tailwind utility classes via the SVG `className`
//      / `style` attributes.
//   3. Single bundle — Webpack/Turbopack tree-shake unused illustrations
//      at the call site, so a route that only uses 'network' doesn't
//      pay for the other nine.
//
// Design language:
//   - Minimal line art — Linear / Arc / Vercel aesthetic
//   - Single accent color = currentColor (inherits text-* from Tailwind)
//   - 24x24 viewBox baseline; consumers scale via Tailwind size classes
//     (size-12, size-16, size-24, ...)
//   - Stroke 1.5 — matches Lucide's default for visual harmony
//   - No filled regions (except `fill="none"`) so dark/light theming
//     happens automatically via currentColor
//
// References:
//   - https://lucide.dev/guide/design (matching stroke style)
//   - https://www.smashingmagazine.com/2024/02/empty-state-design-best-practices/
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { cn } from '@/lib/utils';
import type { ErrorCategory } from '@/lib/errors';

// ─── Props ─────────────────────────────────────────────────────

export interface IllustrationProps extends React.SVGProps<SVGSVGElement> {
  /** Tailwind size class. Defaults to size-12 (48px). */
  readonly className?: string;
}

// ─── Per-category illustrations ────────────────────────────────

/**
 * Common SVG props applied to every illustration. Keeps the file
 * uniform and ensures every illustration responds to theme color
 * via currentColor.
 */
function svgBaseProps(className: string | undefined): React.SVGProps<SVGSVGElement> {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 64 64',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
    className: cn('size-12', className),
  };
}

/**
 * NETWORK — Wi-fi-style arcs with a slash across them.
 * Communicates: "your connection is the problem".
 */
export function NetworkIllustration({ className, ...rest }: IllustrationProps): React.ReactElement {
  return (
    <svg {...svgBaseProps(className)} {...rest}>
      <title>Network connection lost</title>
      {/* Three concentric arcs */}
      <path d="M14 36c10-10 26-10 36 0" />
      <path d="M20 42c6.5-6.5 17.5-6.5 24 0" />
      <path d="M26 48c3-3 9-3 12 0" />
      {/* Centre dot */}
      <circle cx="32" cy="54" r="1.5" fill="currentColor" stroke="none" />
      {/* Slash */}
      <path d="M14 18 50 54" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/**
 * AUTH — Padlock with a question mark above it.
 * Communicates: "we need to verify who you are".
 */
export function AuthIllustration({ className, ...rest }: IllustrationProps): React.ReactElement {
  return (
    <svg {...svgBaseProps(className)} {...rest}>
      <title>Authentication required</title>
      {/* Lock body */}
      <rect x="16" y="28" width="32" height="24" rx="3" />
      {/* Shackle */}
      <path d="M22 28v-6a10 10 0 0 1 20 0v6" />
      {/* Keyhole */}
      <circle cx="32" cy="40" r="2" />
      <path d="M32 42v4" />
    </svg>
  );
}

/**
 * VALIDATION — A document with an exclamation mark.
 * Communicates: "something about the submitted data is wrong".
 */
export function ValidationIllustration({
  className,
  ...rest
}: IllustrationProps): React.ReactElement {
  return (
    <svg {...svgBaseProps(className)} {...rest}>
      <title>Validation failed</title>
      <path d="M18 8h22l8 8v40a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" />
      <path d="M40 8v8h8" />
      <path d="M32 28v12" />
      <circle cx="32" cy="46" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * RATE LIMIT — Hourglass with motion lines.
 * Communicates: "wait a moment".
 */
export function RateLimitIllustration({
  className,
  ...rest
}: IllustrationProps): React.ReactElement {
  return (
    <svg {...svgBaseProps(className)} {...rest}>
      <title>Rate limit reached</title>
      <path d="M20 8h24" />
      <path d="M20 56h24" />
      <path d="M20 8c0 12 24 12 24 24s-24 12-24 24" />
      <path d="M44 8c0 12-24 12-24 24s24 12 24 24" />
      {/* Sand grains */}
      <circle cx="32" cy="36" r="1" fill="currentColor" stroke="none" />
      <circle cx="30" cy="40" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="34" cy="42" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * NOT FOUND — Magnifying glass over an empty space.
 * Communicates: "we looked, but the thing isn't here".
 */
export function NotFoundIllustration({
  className,
  ...rest
}: IllustrationProps): React.ReactElement {
  return (
    <svg {...svgBaseProps(className)} {...rest}>
      <title>Page not found</title>
      <circle cx="28" cy="28" r="14" />
      <path d="M38 38l12 12" />
      {/* Empty centre — small dashed dot grid */}
      <circle cx="22" cy="28" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="28" cy="28" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="34" cy="28" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * SERVER — Server tower with a small warning indicator.
 * Communicates: "the backend is having a moment".
 */
export function ServerIllustration({ className, ...rest }: IllustrationProps): React.ReactElement {
  return (
    <svg {...svgBaseProps(className)} {...rest}>
      <title>Server error</title>
      {/* Two stacked rectangles for the server */}
      <rect x="14" y="14" width="36" height="14" rx="2" />
      <rect x="14" y="34" width="36" height="14" rx="2" />
      {/* LED indicators */}
      <circle cx="42" cy="21" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="42" cy="41" r="1.5" fill="currentColor" stroke="none" />
      {/* Cable / drop */}
      <path d="M32 48v10" />
    </svg>
  );
}

/**
 * AI SERVICE — Brain-circuit outline.
 * Communicates: "the AI brain is temporarily offline".
 */
export function AiServiceIllustration({
  className,
  ...rest
}: IllustrationProps): React.ReactElement {
  return (
    <svg {...svgBaseProps(className)} {...rest}>
      <title>AI service unavailable</title>
      {/* Brain hemispheres */}
      <path d="M22 32a8 8 0 0 1 8-8v24a8 8 0 0 1-8-8 6 6 0 0 1 0-8z" />
      <path d="M42 32a8 8 0 0 0-8-8v24a8 8 0 0 0 8-8 6 6 0 0 0 0-8z" />
      {/* Circuit nodes */}
      <circle cx="32" cy="20" r="2" />
      <circle cx="32" cy="44" r="2" />
      <path d="M32 22v2" />
      <path d="M32 40v2" />
    </svg>
  );
}

/**
 * CONSULTATION STATE — Calendar with a strike-through.
 * Communicates: "this session is over".
 */
export function ConsultationStateIllustration({
  className,
  ...rest
}: IllustrationProps): React.ReactElement {
  return (
    <svg {...svgBaseProps(className)} {...rest}>
      <title>Consultation expired</title>
      <rect x="12" y="14" width="40" height="40" rx="3" />
      <path d="M12 24h40" />
      <path d="M22 10v8" />
      <path d="M42 10v8" />
      {/* Strike */}
      <path d="M20 34l24 12" />
    </svg>
  );
}

/**
 * CHUNK LOAD — Download arrow with a broken segment.
 * Communicates: "the app's code finished an update — refresh".
 */
export function ChunkLoadIllustration({
  className,
  ...rest
}: IllustrationProps): React.ReactElement {
  return (
    <svg {...svgBaseProps(className)} {...rest}>
      <title>App update in progress</title>
      <path d="M32 10v28" strokeDasharray="2 4" />
      <path d="M20 28l12 12 12-12" />
      <path d="M14 50h36" />
    </svg>
  );
}

/**
 * UNKNOWN — Triangle with exclamation. The safe fallback when no
 * other illustration fits the category.
 */
export function UnknownIllustration({ className, ...rest }: IllustrationProps): React.ReactElement {
  return (
    <svg {...svgBaseProps(className)} {...rest}>
      <title>An unexpected error occurred</title>
      <path d="M32 8 L58 54 H6 Z" />
      <path d="M32 24v14" />
      <circle cx="32" cy="46" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ─── Resolver ──────────────────────────────────────────────────

/**
 * Resolve an error category to its illustration component.
 *
 * Returns a component reference (NOT a JSX element) so the caller can
 * apply props (`className`, `style`) at the consumption site.
 *
 * @example
 *   const Illustration = getIllustrationFor(category)
 *   <Illustration className="size-24 text-muted-foreground" />
 */
export function getIllustrationFor(
  category: ErrorCategory,
): React.ComponentType<IllustrationProps> {
  switch (category) {
    case 'network':
      return NetworkIllustration;
    case 'auth':
      return AuthIllustration;
    case 'validation':
      return ValidationIllustration;
    case 'rate-limit':
      return RateLimitIllustration;
    case 'not-found':
      return NotFoundIllustration;
    case 'server':
      return ServerIllustration;
    case 'ai-service':
      return AiServiceIllustration;
    case 'consultation-state':
      return ConsultationStateIllustration;
    case 'chunk-load':
      return ChunkLoadIllustration;
    case 'unknown':
      return UnknownIllustration;
    default: {
      const _exhaustive: never = category;
      void _exhaustive;
      return UnknownIllustration;
    }
  }
}
