'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

interface RadioGroupContextValue {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}
const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  /** Accessible group label (rendered as a <legend>). */
  label?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Datun RadioGroup — Part 15.5. fieldset/legend, one-of-set. Roving tab + arrow-key
 * nav handled by native radios sharing a `name`. Token-only.
 */
export function RadioGroup({
  name,
  value,
  defaultValue,
  onValueChange,
  disabled,
  label,
  className,
  children,
}: RadioGroupProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const autoName = React.useId();
  const ctx: RadioGroupContextValue = {
    name: name ?? autoName,
    value: current,
    disabled,
    onValueChange: (v) => {
      if (!isControlled) setInternal(v);
      onValueChange?.(v);
    },
  };
  return (
    <fieldset
      className={cn('dtn-radiogroup', className)}
      style={{ border: 0, margin: 0, padding: 0 }}
    >
      {label && (
        <legend className="dtn-choice__label" style={{ marginBlockEnd: 'var(--space-8)' }}>
          {label}
        </legend>
      )}
      <RadioGroupContext.Provider value={ctx}>{children}</RadioGroupContext.Provider>
    </fieldset>
  );
}

export interface RadioProps {
  value: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  id?: string;
}

/** A single radio — must be a child of <RadioGroup>. */
export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ value, label, description, disabled, id }, ref) => {
    const ctx = React.useContext(RadioGroupContext);
    const autoId = React.useId();
    const fieldId = id ?? autoId;
    const checked = ctx?.value === value;
    const isDisabled = disabled || ctx?.disabled;
    return (
      <label
        className={cn('dtn-choice', isDisabled && 'dtn-choice--disabled')}
        htmlFor={fieldId}
        aria-disabled={isDisabled || undefined}
      >
        <span className="dtn-hit">
          <input
            ref={ref}
            id={fieldId}
            type="radio"
            className="dtn-choice__input peer"
            name={ctx?.name}
            value={value}
            checked={checked}
            disabled={isDisabled}
            onChange={() => ctx?.onValueChange?.(value)}
          />
          <span
            className={cn(
              'dtn-radio',
              checked && 'dtn-radio--checked',
              'peer-focus-visible:dtn-radio--focus',
            )}
          />
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
Radio.displayName = 'Radio';
