import * as React from 'react';
import { cn } from '../lib/cn';

type Base = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>;

export interface InputProps extends Base {
  invalid?: boolean;
  /** Leading icon node (Phosphor). */
  leadingIcon?: React.ReactNode;
  /** Static prefix/suffix (e.g. "₹", "@") — not the label. */
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  /** Trailing action (clear, password toggle…). */
  trailing?: React.ReactNode;
}

/**
 * Datun Input — Part 15.4. Token-only, ≥16px font (no iOS zoom), full-width.
 * Compose inside <Field>. RHF-ready via forwardRef + name. Pair `type` with the
 * right `autocomplete` (tel / email / one-time-code…). Currency = ₹ Indian grouping.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, invalid, disabled, readOnly, leadingIcon, prefix, suffix, trailing, ...props },
    ref,
  ) => (
    <div
      className={cn(
        'dtn-input',
        invalid && 'dtn-input--error',
        disabled && 'dtn-input--disabled',
        readOnly && 'dtn-input--readonly',
        className,
      )}
    >
      {leadingIcon && (
        <span className="dtn-input__icon" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      {prefix && (
        <span className="dtn-input__affix" aria-hidden="true">
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        className="dtn-input__el"
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={invalid || undefined}
        {...props}
      />
      {suffix && (
        <span className="dtn-input__affix" aria-hidden="true">
          {suffix}
        </span>
      )}
      {trailing}
    </div>
  ),
);
Input.displayName = 'Input';

/** Format a number as Indian-grouped rupees: 100000 → "₹1,00,000" (Part 12.13). */
export function formatINR(value: number): string {
  return '₹' + value.toLocaleString('en-IN');
}
