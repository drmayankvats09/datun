'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Avatar — Part 15.11 + Part 14.8. Circle-crop (Part 6), size scale (Part 5;
 * 64–96 on profiles). Verified-badge overlay; initials-fallback on a tonal teal
 * background (never a broken image / generic silhouette). Patient avatars =
 * initials (privacy-first). Built on the same contract as Radix Avatar.
 */
export type AvatarSize = 24 | 32 | 40 | 48 | 64 | 96;

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  /** Required for alt + initials fallback. */
  name: string;
  size?: AvatarSize;
  verified?: boolean;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')
  ).toUpperCase();
}

export function Avatar({ src, name, size = 40, verified, className, ...props }: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const showImg = src && !failed;
  return (
    <span
      className={cn('dtn-avatar', `dtn-avatar--${size}`, className)}
      style={{ ['--av' as string]: `var(--avatar-${size})` }}
      {...props}
    >
      {showImg ? (
        <img
          className="dtn-avatar__img"
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="dtn-avatar__initials" aria-label={name} role="img">
          {initials(name)}
        </span>
      )}
      {verified && (
        <span className="dtn-avatar__badge" aria-label="Verified">
          <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="11" fill="var(--color-success)" />
            <path
              d="M7.5 12.3 10.5 15l6-6.4"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </span>
  );
}
