// ═══════════════════════════════════════════════════════════════
// AVATAR IMAGE — Task #46 circular avatar with initials fallback
//
// Specialised wrapper around <OptimizedImage> for profile photos
// (USER_AVATAR, DOCTOR_AVATAR). Differences from the generic
// <OptimizedImage>:
//
//   1. Always circular (rounded-full)
//   2. Always square aspect (1:1) via fixed pixel dimensions
//   3. Initials fallback when src is missing or load fails
//   4. Optional ring/border for doctor avatars (verified-doctor badge)
//   5. Smaller default quality (avatars don't need 1568px detail)
//
// Reuses the shadcn Avatar primitive (apps/web/components/ui/avatar.tsx)
// for the fallback shell — it provides accessible <span> structure and
// safe initials rendering.
//
// Pattern: GitHub avatars, Linear member chips, Notion user mentions.
// ═══════════════════════════════════════════════════════════════

'use client';

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OptimizedImage } from './optimized-image';
import { cn } from '@/lib/utils';

// ─── Props ──────────────────────────────────────────────────

export interface AvatarImageProps {
  /** Cloudflare Images URL — typically variants.thumbnail or .medium. */
  readonly src?: string | null;
  /** Display name; first 2 alphanumerics used as fallback initials. */
  readonly name: string;
  /** Optional blurhash for placeholder while loading. */
  readonly blurhash?: string | null;
  /** Pixel size (square). Defaults to 40. */
  readonly size?: number;
  /** Adds an indigo ring — used to badge verified doctors. */
  readonly verified?: boolean;
  /** Alt text override; defaults to a privacy-safe label. */
  readonly alt?: string;
  /** Extra className for the outer container. */
  readonly className?: string;
}

// ─── Component ──────────────────────────────────────────────

export function AvatarImage({
  src,
  name,
  blurhash,
  size = 40,
  verified = false,
  alt,
  className,
}: AvatarImageProps): JSX.Element {
  const [hasFailed, setHasFailed] = useState(false);
  const initials = useMemo(() => deriveInitials(name), [name]);
  const showFallback = !src || hasFailed;
  const altText = alt ?? `${name}'s profile picture`;

  return (
    <Avatar
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-full',
        verified && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {!showFallback && src ? (
        <OptimizedImage
          src={src}
          alt={altText}
          blurhash={blurhash ?? null}
          width={size}
          height={size}
          className="h-full w-full"
          sizes={`${size}px`}
          onError={() => setHasFailed(true)}
        />
      ) : null}
      <AvatarFallback className="flex h-full w-full items-center justify-center bg-muted text-xs font-medium text-foreground uppercase">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function deriveInitials(name: string): string {
  // Split on whitespace, take first letter of first two words.
  // Strip non-alphanumeric to keep emoji/special chars out.
  const words = name.trim().split(/\s+/).slice(0, 2);
  const letters = words
    .map((w) => {
      // Use Array.from for proper handling of multi-byte chars (emoji etc.).
      const chars = Array.from(w).filter((c) => /\p{L}|\p{N}/u.test(c));
      return chars[0] ?? '';
    })
    .filter(Boolean);
  if (letters.length === 0) return '?';
  return letters.join('').toUpperCase().slice(0, 2);
}
