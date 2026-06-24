'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun EntryChips — reusable complaint quick-picks (B1 + reused at B2 chief
 * complaint). Composes the interactive Chip (15.10): ≥48dp targets, aria-pressed,
 * keyboard + SR operable. Token-only; no "AI" copy.
 */
export interface EntryComplaint {
  id: string;
  label: string;
}

/** Default common-complaint set (03 B1). */
export const COMMON_COMPLAINTS: EntryComplaint[] = [
  { id: 'toothache', label: 'Toothache' },
  { id: 'sensitivity', label: 'Sensitivity' },
  { id: 'bleeding-gums', label: 'Bleeding gums' },
  { id: 'swelling', label: 'Swelling' },
  { id: 'broken-tooth', label: 'Broken tooth' },
  { id: 'bad-breath', label: 'Bad breath' },
  { id: 'wisdom-tooth', label: 'Wisdom-tooth pain' },
];

export interface EntryChipsProps {
  complaints?: EntryComplaint[];
  /** Controlled selected ids. */
  selected?: string[];
  onToggle?: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function EntryChips({
  complaints = COMMON_COMPLAINTS,
  selected = [],
  onToggle,
  className,
  ariaLabel = 'Common complaints',
}: EntryChipsProps) {
  return (
    <div className={cn('dtn-entrychips', className)} role="group" aria-label={ariaLabel}>
      {complaints.map((c) => {
        const on = selected.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            className={cn('dtn-chip dtn-chip--interactive', on && 'dtn-chip--selected')}
            aria-pressed={on}
            onClick={() => onToggle?.(c.id)}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
