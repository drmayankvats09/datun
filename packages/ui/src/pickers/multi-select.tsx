'use client';

import * as React from 'react';

export interface MultiSelectOption {
  value: string;
  label: string;
}
export interface MultiSelectProps {
  options: MultiSelectOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  id?: string;
  'aria-label': string;
}

/**
 * Datun Multi-select — Part 15.6. Selected shown as removable chips (15.10).
 * aria-multiselectable listbox; selection announced; chips have aria-labels.
 * Use for filter facets. Token-only.
 */
export function MultiSelect({
  options,
  value,
  defaultValue = [],
  onValueChange,
  placeholder = 'Add filters',
  id,
  ...aria
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<string[]>(defaultValue);
  const isControlled = value !== undefined;
  const selected = isControlled ? value! : internal;
  const set = (next: string[]) => {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };
  const toggle = (v: string) =>
    set(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const chips = options.filter((o) => selected.includes(o.value));

  return (
    <div
      style={{ position: 'relative', inlineSize: '100%' }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <div
        className="dtn-chips"
        role="button"
        tabIndex={0}
        id={id}
        aria-label={aria['aria-label']}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        {chips.length === 0 && (
          <span className="dtn-trigger__value--placeholder" style={{ font: 'var(--type-body-m)' }}>
            {placeholder}
          </span>
        )}
        {chips.map((o) => (
          <span key={o.value} className="dtn-chip">
            {o.label}
            <button
              className="dtn-chip__x"
              aria-label={`Remove ${o.label}`}
              onClick={(e) => {
                e.stopPropagation();
                toggle(o.value);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        ))}
      </div>
      {open && (
        <ul
          role="listbox"
          aria-multiselectable="true"
          className="dtn-popover"
          style={{ position: 'absolute', insetBlockStart: 'calc(100% + 4px)' }}
        >
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={selected.includes(o.value)}
              className="dtn-option"
              onClick={() => toggle(o.value)}
            >
              <span style={{ flex: 1 }}>{o.label}</span>
              <span className="dtn-option__check">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                  <path
                    d="M20 6 9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
