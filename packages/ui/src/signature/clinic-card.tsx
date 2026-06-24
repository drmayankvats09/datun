'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Clinic card (Part 15.12, Family C1c/C3). COMPOSED: media + verified glyph +
 * Button. Photo + name + verified badge + services + distance + rating + Book/Directions.
 */
export interface ClinicCardProps {
  name: string;
  photoUrl?: string;
  services: string[];
  distanceKm: number;
  rating: number;
  reviews: number;
  area: string;
  verified?: boolean;
  onBook?: () => void;
  onDirections?: () => void;
  className?: string;
}

export function ClinicCard({
  name,
  photoUrl,
  services,
  distanceKm,
  rating,
  reviews,
  area,
  verified,
  onBook,
  onDirections,
  className,
}: ClinicCardProps) {
  return (
    <article className={cn('dtn-clinic', className)}>
      <div className="dtn-clinic__media">
        {photoUrl ? (
          <img src={photoUrl} alt={`${name} clinic`} />
        ) : (
          <div className="dtn-clinic__ph" aria-hidden="true" />
        )}
        {verified && (
          <span className="dtn-clinic__vbadge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
              <circle cx="12" cy="12" r="11" fill="var(--color-success)" />
              <path
                d="M7.5 12.3 10.5 15l6-6.4"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>{' '}
            Verified
          </span>
        )}
      </div>
      <div className="dtn-clinic__body">
        <h3 className="dtn-clinic__name">{name}</h3>
        <p className="dtn-clinic__meta">
          <span className="dtn-clinic__rate">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M12 3l2.5 5.7 6.2.6-4.7 4.1 1.4 6.1L12 16.9 6.6 19.6l1.4-6.1L3.3 9.3l6.2-.6Z" />
            </svg>{' '}
            {rating.toFixed(1)} ({reviews})
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {area} · {distanceKm} km
          </span>
        </p>
        <p className="dtn-clinic__svc">{services.join(' · ')}</p>
        <div className="dtn-clinic__actions">
          <button type="button" className="dtn-clinic__book" onClick={onBook}>
            Book
          </button>
          <button type="button" className="dtn-clinic__dir" onClick={onDirections}>
            Directions
          </button>
        </div>
      </div>
    </article>
  );
}
