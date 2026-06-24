'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Tooltip — Part 15.9 + Part 13.11. L3, z-tooltip. Hover (desktop, delay-in) +
 * keyboard focus; touch users get the same content via long-press (the host element
 * stays usable). NEVER the sole carrier of information (13.11) — supplementary only.
 * Transform/opacity motion, reduced-motion safe (Part 9).
 */
export interface TooltipProps {
  label: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom';
  /** ms before show on hover (Part 9). */
  delay?: number;
}

export function Tooltip({ label, children, side = 'top', delay = 300 }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = React.useId();

  const show = () => {
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  const child = React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    'aria-describedby': id,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: () => setOpen(true),
    onBlur: hide,
  });

  return (
    <span className="dtn-tooltip-anchor">
      {child}
      <span
        role="tooltip"
        id={id}
        className={cn('dtn-tooltip', `dtn-tooltip--${side}`, open && 'dtn-tooltip--open')}
      >
        {label}
      </span>
    </span>
  );
}
