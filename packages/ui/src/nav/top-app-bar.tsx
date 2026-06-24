'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface TopAppBarProps {
  title: string;
  onBack?: () => void;
  backHref?: string;
  action?: React.ReactNode; // trailing action button(s)
  className?: string;
}

/**
 * Datun app-face top app-bar — Part 15.8. Contextual title + back/up + actions.
 * Safe-area top inset (Part 4.10). Token-only.
 */
export function TopAppBar({ title, onBack, backHref, action, className }: TopAppBarProps) {
  const Back = backHref ? 'a' : 'button';
  return (
    <header className={cn('dtn-appbar', className)}>
      {(onBack || backHref) && (
        <Back
          className="dtn-appbar__back"
          aria-label="Back"
          {...(backHref ? { href: backHref } : { onClick: onBack, type: 'button' })}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="m15 18-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Back>
      )}
      <h1 className="dtn-appbar__title">{title}</h1>
      {action}
    </header>
  );
}
