'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

let _id = 0;
const useFieldId = (provided?: string) => {
  const reactId = React.useId();
  return provided ?? `dtn-field-${reactId || ++_id}`;
};

export interface FieldProps {
  /** Label — ALWAYS visible, sentence-case, no colon (15.4 / 12.7). */
  label: string;
  /** Persistent helper text below the control. */
  helper?: string;
  /** Inline error — replaces helper; specific + corrective (12.8). Announced via role="alert". */
  error?: string;
  /** Mark required (only the minority — 15.4). */
  required?: boolean;
  /** Show an "optional" hint instead (when most fields are required). */
  optional?: boolean;
  id?: string;
  className?: string;
  /** Render prop receives the wiring to spread onto the control. */
  children: (wiring: {
    id: string;
    'aria-invalid'?: boolean;
    'aria-required'?: boolean;
    'aria-describedby'?: string;
  }) => React.ReactNode;
}

/**
 * Datun Field — owns label + helper + inline error + full a11y wiring (Part 15.4).
 * Compose every input type inside it. RHF/Zod-friendly (the control inside takes `name`/ref).
 */
export function Field({
  label,
  helper,
  error,
  required,
  optional,
  id,
  className,
  children,
}: FieldProps) {
  const fieldId = useFieldId(id);
  const helpId = `${fieldId}-help`;
  const errId = `${fieldId}-err`;
  const describedBy = error ? errId : helper ? helpId : undefined;
  return (
    <div className={cn('dtn-field', className)}>
      <label className="dtn-field__label" htmlFor={fieldId}>
        {label}
        {required && (
          <span className="dtn-field__req" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="dtn-field__optional">(optional)</span>}
      </label>
      {children({
        id: fieldId,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
        'aria-describedby': describedBy,
      })}
      {error ? (
        <output id={errId} className="dtn-field__error" role="alert" aria-live="polite">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 8v5M12 16h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {error}
        </output>
      ) : helper ? (
        <span id={helpId} className="dtn-field__help">
          {helper}
        </span>
      ) : null}
    </div>
  );
}
