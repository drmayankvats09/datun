import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Skeleton — Part 15.10. Default for content load (1–10s). Calm CSS-first
 * pulse, subtle. `aria-busy` + `aria-hidden` (not focusable, not announced char-by-char).
 * Reserves layout space (anti-CLS, Part 4). NEVER for toasts/menus/the modal shell.
 * Reduced-motion → static block (Part 9).
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual shape. */
  shape?: 'line' | 'block' | 'circle';
  /** CSS width / height (token or length). */
  w?: string;
  h?: string;
}

export function Skeleton({ shape = 'line', w, h, className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('dtn-skeleton', `dtn-skeleton--${shape}`, className)}
      style={{ width: w, height: h, ...style }}
      aria-hidden="true"
      {...props}
    />
  );
}

/** A labelled busy region wrapper — announces "Loading" once to AT. */
export function SkeletonRegion({
  label = 'Loading',
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="dtn-sr-only">{label}…</span>
      {children}
    </div>
  );
}
