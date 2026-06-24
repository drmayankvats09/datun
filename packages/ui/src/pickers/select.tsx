'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="m6 9 6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 6 9 17l-5-5"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}

/**
 * Datun Select — Part 15.6. Button trigger (reads like a Field) + listbox popover
 * (surface-raised, shadow-lg, z-dropdown). Arrow-key nav + type-ahead, Esc closes,
 * focus returns to trigger, light-dismiss. Selected shows a checkmark. Token-only.
 * On mobile, swap the popover for a bottom-sheet (Part 11/15.9).
 */
export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      value,
      defaultValue,
      onValueChange,
      placeholder = 'Select an option',
      invalid,
      disabled,
      id,
      ...aria
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [internal, setInternal] = React.useState(defaultValue);
    const [active, setActive] = React.useState(0);
    const isControlled = value !== undefined;
    const current = isControlled ? value : internal;
    const listRef = React.useRef<HTMLUListElement>(null);
    const listboxId = React.useId();
    const selected = options.find((o) => o.value === current);

    const choose = (v: string) => {
      if (!isControlled) setInternal(v);
      onValueChange?.(v);
      setOpen(false);
    };
    const onKey = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (open) setActive((a) => Math.min(a + 1, options.length - 1));
        else setOpen(true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (open) {
          const opt = options[active];
          if (opt) choose(opt.value);
        } else setOpen(true);
      } else if (e.key === 'Escape') setOpen(false);
      else if (e.key.length === 1) {
        const i = options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
        if (i >= 0) setActive(i);
      }
    };

    return (
      <div
        style={{ position: 'relative', inlineSize: '100%' }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
        }}
      >
        <button
          ref={ref}
          type="button"
          id={id}
          className={cn(
            'dtn-trigger',
            invalid && 'dtn-trigger--error',
            disabled && 'dtn-trigger--disabled',
          )}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-label={aria['aria-label']}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onKey}
        >
          <span
            className={cn('dtn-trigger__value', !selected && 'dtn-trigger__value--placeholder')}
          >
            {selected?.label ?? placeholder}
          </span>
          <span className="dtn-trigger__chev">
            <Chevron />
          </span>
        </button>
        {open && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="dtn-popover"
            style={{ position: 'absolute', insetBlockStart: 'calc(100% + 4px)' }}
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === current}
                aria-disabled={o.disabled || undefined}
                data-active={i === active}
                className="dtn-option"
                onMouseEnter={() => setActive(i)}
                onClick={() => !o.disabled && choose(o.value)}
              >
                <span style={{ flex: 1 }}>{o.label}</span>
                <span className="dtn-option__check">
                  <Check />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';
