import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Badge — Part 15.10 + Part 8.6. Static status / count. Semantic colour
 * ALWAYS paired with text or an icon — never colour-alone. Token-only.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'info';
  /** Dot indicator before the label (still text-backed). */
  dot?: boolean;
  icon?: React.ReactNode;
}

export function Badge({ tone = 'neutral', dot, icon, children, className, ...props }: BadgeProps) {
  return (
    <span className={cn('dtn-badge', `dtn-badge--${tone}`, className)} {...props}>
      {dot && <span className="dtn-badge__dot" aria-hidden="true" />}
      {icon && (
        <span className="dtn-badge__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
