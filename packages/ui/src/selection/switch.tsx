'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface SwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange'
> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Label is ALWAYS required (15.5). */
  label: React.ReactNode;
  description?: React.ReactNode;
}

/**
 * Datun Switch — Part 15.5. role="switch" + aria-checked, Space/Enter toggles,
 * instant-update, label always. State conveyed by thumb position (not colour-alone).
 * Thumb slides ~200ms (reduced-motion → instant). Token-only.
 * CONSENT (16.11/DPDP): opt-in switches default OFF.
 */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked,
      defaultChecked,
      onCheckedChange,
      label,
      description,
      disabled,
      id,
      ...props
    },
    ref,
  ) => {
    const [internal, setInternal] = React.useState(!!defaultChecked);
    const isControlled = checked !== undefined;
    const on = isControlled ? checked : internal;
    const autoId = React.useId();
    const fieldId = id ?? autoId;
    const toggle = () => {
      if (disabled) return;
      const next = !on;
      if (!isControlled) setInternal(next);
      onCheckedChange?.(next);
    };
    return (
      <span
        className={cn('dtn-choice', disabled && 'dtn-choice--disabled', className)}
        aria-disabled={disabled || undefined}
      >
        <button
          ref={ref}
          type="button"
          role="switch"
          id={fieldId}
          aria-checked={on}
          aria-labelledby={`${fieldId}-l`}
          disabled={disabled}
          className={cn('dtn-switch', on && 'dtn-switch--on', 'focus-visible:dtn-switch--focus')}
          onClick={toggle}
          {...props}
        >
          <span className="dtn-switch__thumb" />
        </button>
        <span className="dtn-choice__text">
          <span className="dtn-choice__label" id={`${fieldId}-l`} onClick={toggle}>
            {label}
          </span>
          {description && <span className="dtn-choice__desc">{description}</span>}
        </span>
      </span>
    );
  },
);
Switch.displayName = 'Switch';
