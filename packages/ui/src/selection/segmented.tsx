'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface SegmentedOption {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}
export interface SegmentedProps {
  options: SegmentedOption[]; // 2–4 mutually-exclusive options
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Accessible group label. */
  'aria-label': string;
  className?: string;
}

/**
 * Datun Segmented control — Part 15.5. role="radiogroup", 2–4 mutually-exclusive
 * options, arrow-key nav, inner full pills inside an lg container. Token-only.
 * Use for filters and yes/no consult questions.
 */
export function Segmented({
  options,
  value,
  defaultValue,
  onValueChange,
  className,
  ...aria
}: SegmentedProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? options[0]?.value);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const select = (v: string) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
  };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const n = (i + dir + options.length) % options.length;
    refs.current[n]?.focus();
    const opt = options[n];
    if (opt) select(opt.value);
  };
  return (
    <div
      role="radiogroup"
      aria-label={aria['aria-label']}
      className={cn('dtn-segmented', className)}
    >
      {options.map((o, i) => {
        const checked = current === o.value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className="dtn-segmented__opt"
            onClick={() => select(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
