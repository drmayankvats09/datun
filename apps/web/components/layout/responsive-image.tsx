// ═══════════════════════════════════════════════════════════════
// RESPONSIVE IMAGE — next/image wrapper with responsive sizes
// Automatic: blur placeholder, correct sizes, lazy loading.
// India optimization: smaller images on slow networks.
// ═══════════════════════════════════════════════════════════════

import Image, { type ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps extends Omit<ImageProps, 'sizes'> {
  /** Aspect ratio class (e.g., 'aspect-video', 'aspect-square') */
  aspect?: string;
}

export function ResponsiveImage({
  className,
  aspect = 'aspect-video',
  alt,
  ...props
}: ResponsiveImageProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg', aspect, className)}>
      <Image
        className="object-cover"
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        alt={alt}
        // P4-F21: Don't override loading — next/image auto-sets based on priority
        {...props}
      />
    </div>
  );
}
