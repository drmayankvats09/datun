import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Spinner — Part 15.10 + Part 12.4/12.11. Small inline / in-button indeterminate
 * indicator for short waits. Label is honest + human — "Reviewing…", "Submitting…" —
 * and NEVER "Analyzing with AI" (the AI-word is banned, Part 12.4). Reduced-motion safe.
 */
export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md';
  /** Visible/AT label. Honest, never "AI". */
  label?: string;
  /** Hide the text label visually (keep for AT) — e.g. inside a button. */
  labelHidden?: boolean;
}

export function Spinner({
  size = 'sm',
  label = 'Reviewing',
  labelHidden,
  className,
  ...props
}: SpinnerProps) {
  return (
    <span className={cn('dtn-spinner-wrap', className)} role="status" {...props}>
      <span className={cn('dtn-spinner', `dtn-spinner--${size}`)} aria-hidden="true" />
      <span className={cn(labelHidden ? 'dtn-sr-only' : 'dtn-spinner__label')}>{label}…</span>
    </span>
  );
}
