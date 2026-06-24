'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

const CheckGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 6 9 17l-5-5"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const DashGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 12h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  /** Tri-state: shows the dash, sets aria-checked="mixed". */
  indeterminate?: boolean;
  invalid?: boolean;
}

/**
 * Datun Checkbox — Part 15.5. Native <input type=checkbox> (a11y-first, Part 13.6),
 * radius xs 4, ≥48dp hit-area, indeterminate (aria-checked=mixed). Token-only.
 * CONSENT (16.11/DPDP): never default-checked for opt-in — pass checked={false}.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, indeterminate, invalid, disabled, id, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);
    React.useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = !!indeterminate;
    }, [indeterminate]);
    const autoId = React.useId();
    const fieldId = id ?? autoId;
    return (
      <label
        className={cn('dtn-choice', disabled && 'dtn-choice--disabled', className)}
        htmlFor={fieldId}
        aria-disabled={disabled || undefined}
      >
        <span className="dtn-hit">
          <input
            ref={innerRef}
            id={fieldId}
            type="checkbox"
            className="dtn-choice__input peer"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-checked={indeterminate ? 'mixed' : undefined}
            {...props}
          />
          <span
            className={cn(
              'dtn-check',
              'peer-checked:dtn-check--checked',
              'peer-focus-visible:dtn-check--focus',
              indeterminate && 'dtn-check--indeterminate',
              invalid && 'dtn-check--error',
            )}
          >
            {indeterminate ? <DashGlyph /> : <CheckGlyph />}
          </span>
        </span>
        {(label || description) && (
          <span className="dtn-choice__text">
            {label && <span className="dtn-choice__label">{label}</span>}
            {description && <span className="dtn-choice__desc">{description}</span>}
          </span>
        )}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
