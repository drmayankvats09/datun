import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Chip / Tag — Part 15.10 + Part 6 (radius full) + Part 5.3 (≥48dp if interactive).
 * Two clearly-distinct modes (never blurred):
 *  - static  : a non-interactive category/data tag (renders as <span>).
 *  - interactive : filter / selection / QUICK-REPLY (the consult Q&A answers) — a real
 *    <button>, ≥48dp target, aria-pressed when selectable, focus-visible ring.
 */
type ChipBase = { icon?: React.ReactNode; className?: string; children: React.ReactNode };

export interface StaticChipProps
  extends ChipBase, Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  interactive?: false;
}
export interface InteractiveChipProps
  extends ChipBase, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  interactive: true;
  selected?: boolean;
}
export type ChipProps = StaticChipProps | InteractiveChipProps;

export function Chip(props: ChipProps) {
  if (props.interactive) {
    const { interactive: _i, selected, icon, className, children, ...rest } = props;
    return (
      <button
        type="button"
        className={cn(
          'dtn-chip dtn-chip--interactive',
          selected && 'dtn-chip--selected',
          className,
        )}
        aria-pressed={selected}
        {...rest}
      >
        {icon && (
          <span className="dtn-chip__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </button>
    );
  }
  const { interactive: _i2, icon, className, children, ...rest } = props;
  return (
    <span className={cn('dtn-chip dtn-chip--static', className)} {...rest}>
      {icon && (
        <span className="dtn-chip__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
