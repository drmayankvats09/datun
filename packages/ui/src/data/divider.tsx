import * as React from 'react';
import { cn } from '../lib/cn';

/** Datun Divider — Part 15.11 + Part 8. border-subtle separator, optional inset. */
export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  inset?: boolean;
}
export function Divider({ orientation = 'horizontal', inset, className, ...props }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'dtn-divider',
        `dtn-divider--${orientation}`,
        inset && 'dtn-divider--inset',
        className,
      )}
      {...props}
    />
  );
}
