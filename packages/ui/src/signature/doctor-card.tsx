'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Doctor card (Part 15.12, Family C1c/C2). COMPOSED: Avatar (real verified
 * headshot, 64–96, circle, NO stock) + verified glyph + Button. Warm, scannable.
 * Patient never sees a stock face — initials only if no real photo (privacy/honesty).
 */
export interface DoctorCardProps {
  name: string;
  /** BDS / MDS etc. */
  qualification: string;
  specialty: string;
  clinic: string;
  area: string;
  distanceKm: number;
  rating: number;
  reviews: number;
  feesNote?: string;
  nextSlot?: string;
  photoUrl?: string;
  verified?: boolean;
  onBook?: () => void;
  onProfile?: () => void;
  className?: string;
}

function initials(n: string) {
  const p = n
    .replace(/^Dr\.?\s*/i, '')
    .trim()
    .split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? (p[p.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

export function DoctorCard(props: DoctorCardProps) {
  const {
    name,
    qualification,
    specialty,
    clinic,
    area,
    distanceKm,
    rating,
    reviews,
    feesNote,
    nextSlot,
    photoUrl,
    verified,
    onBook,
    onProfile,
    className,
  } = props;
  return (
    <article className={cn('dtn-doc', className)}>
      <div className="dtn-doc__top">
        <span
          className="dtn-avatar dtn-avatar--64"
          style={{ ['--av' as string]: 'var(--avatar-64)' }}
        >
          {photoUrl ? (
            <img className="dtn-avatar__img" src={photoUrl} alt={name} />
          ) : (
            <span className="dtn-avatar__initials" role="img" aria-label={name}>
              {initials(name)}
            </span>
          )}
          {verified && (
            <span className="dtn-avatar__badge" aria-label="Verified">
              <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
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
        <div className="dtn-doc__id">
          <h3 className="dtn-doc__name">
            {name} {verified && <span className="dtn-doc__vtag">Verified</span>}
          </h3>
          <p className="dtn-doc__qual">
            {qualification} · {specialty}
          </p>
          <p className="dtn-doc__clinic">
            {clinic} · {area}
          </p>
        </div>
      </div>
      <div className="dtn-doc__meta">
        <span className="dtn-doc__rate">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
            <path d="M12 3l2.5 5.7 6.2.6-4.7 4.1 1.4 6.1L12 16.9 6.6 19.6l1.4-6.1L3.3 9.3l6.2-.6Z" />
          </svg>{' '}
          {rating.toFixed(1)} <span>({reviews})</span>
        </span>
        <span className="dtn-doc__dot" aria-hidden="true">
          ·
        </span>
        <span>{distanceKm} km</span>
        {feesNote && (
          <>
            <span className="dtn-doc__dot" aria-hidden="true">
              ·
            </span>
            <span>{feesNote}</span>
          </>
        )}
      </div>
      {nextSlot && <p className="dtn-doc__slot">Next available · {nextSlot}</p>}
      <div className="dtn-doc__actions">
        <button type="button" className="dtn-doc__book" onClick={onBook}>
          Book
        </button>
        <button type="button" className="dtn-doc__profile" onClick={onProfile}>
          View profile
        </button>
      </div>
    </article>
  );
}
