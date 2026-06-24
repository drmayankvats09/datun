'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Consent UI (Part 15.12 + DPDP, 16.11/14.10). Plain-language, GRANULAR,
 * NEVER pre-ticked (legally required — Honest, no dark patterns), purpose-specific.
 * Each purpose is an independent opt-in; nothing is bundled or defaulted on.
 */
export interface ConsentPurpose {
  id: string;
  label: string;
  description: string;
  /** Required to proceed (still must be actively ticked — never pre-checked). */
  required?: boolean;
}
export interface ConsentProps {
  purposes: ConsentPurpose[];
  value: Record<string, boolean>;
  onChange: (id: string, checked: boolean) => void;
  className?: string;
}

export function Consent({ purposes, value, onChange, className }: ConsentProps) {
  return (
    <fieldset className={cn('dtn-consent', className)}>
      <legend className="dtn-consent__legend">Your consent</legend>
      {purposes.map((p) => {
        const checked = !!value[p.id]; // defaults to false — NEVER pre-ticked
        return (
          // eslint-disable-next-line jsx-a11y/label-has-associated-control -- label wraps the checkbox; visible text is nested (depth>2) but read correctly by SRs
          <label key={p.id} className="dtn-consent__item">
            <input
              type="checkbox"
              className="dtn-consent__box"
              checked={checked}
              onChange={(e) => onChange(p.id, e.target.checked)}
              aria-describedby={`${p.id}-d`}
            />
            <span className="dtn-consent__text">
              <span className="dtn-consent__label">
                {p.label}
                {p.required && <span className="dtn-consent__req"> (required)</span>}
              </span>
              <span className="dtn-consent__desc" id={`${p.id}-d`}>
                {p.description}
              </span>
            </span>
          </label>
        );
      })}
      <p className="dtn-consent__foot">
        You can withdraw any consent later in Settings. We never sell your data.
      </p>
    </fieldset>
  );
}
