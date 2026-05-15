// ═══════════════════════════════════════════════════════════════
// RESPONSIVE IMAGE — DEPRECATED SHIM (Task #46)
//
// This component is retained ONLY as a backwards-compatibility wrapper
// over the new <OptimizedImage>. New code SHOULD import OptimizedImage
// directly from `@/components/media/optimized-image`.
//
// Legacy callers using `<ResponsiveImage aspect="aspect-video" ... />`
// continue to work transparently — the prop shape and behaviour are
// preserved via this re-export.
//
// Removal target: when grep shows zero `ResponsiveImage` import sites
// (tracked in docs/migrations/MEDIA-V2.md).
// ═══════════════════════════════════════════════════════════════

import type { JSX } from 'react';
import type { ImageProps } from 'next/image';
import { OptimizedImage } from '@/components/media/optimized-image';

interface ResponsiveImageProps extends Omit<ImageProps, 'sizes'> {
  /** Aspect ratio class (e.g., 'aspect-video', 'aspect-square'). */
  aspect?: string;
}

/**
 * @deprecated Use <OptimizedImage> from `@/components/media/optimized-image`
 *             directly. This wrapper exists only for legacy call sites.
 */
export function ResponsiveImage({
  aspect = 'aspect-video',
  alt,
  className,
  ...rest
}: ResponsiveImageProps): JSX.Element {
  return (
    <OptimizedImage
      {...rest}
      alt={alt}
      aspect={aspect}
      {...(className !== undefined && { className })}
    />
  );
}
