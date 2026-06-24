import * as React from 'react';
import { cn } from '../lib/cn';
// en-IN currency lives in field/input.tsx (single source) — re-export for convenience.
export { formatINR } from '../field/input';

/**
 * Datun Stat / metric — Part 15.11 + Part 3/12.13. Tabular figures, en-IN grouping
 * (₹1,00,000). Big number + plain sentence-case label; optional semantic delta
 * (↑/↓ + text, NEVER colour-alone). Use formatINR / Intl for the value.
 */
export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  label: React.ReactNode;
  /** Optional change indicator. direction sets ↑/↓ + tone; text carries meaning too. */
  delta?: { direction: 'up' | 'down'; text: string };
}
export function Stat({ value, label, delta, className, ...props }: StatProps) {
  return (
    <div className={cn('dtn-stat', className)} {...props}>
      <div className="dtn-stat__value">{value}</div>
      <div className="dtn-stat__label">{label}</div>
      {delta && (
        <div className={cn('dtn-stat__delta', `dtn-stat__delta--${delta.direction}`)}>
          <span aria-hidden="true">{delta.direction === 'up' ? '↑' : '↓'}</span> {delta.text}
        </div>
      )}
    </div>
  );
}
