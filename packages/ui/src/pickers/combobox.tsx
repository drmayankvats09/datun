'use client';

import * as React from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}
export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  /** Controlled query (for async option fetching). */
  query?: string;
  onQueryChange?: (q: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  id?: string;
  'aria-label'?: string;
}

/**
 * Datun Combobox / Autocomplete — Part 15.6 (APG combobox). role="combobox" +
 * aria-autocomplete="list" + aria-controls + aria-activedescendant. Async-ready
 * (controlled query). Calm no-results empty state (never a dead blank). Token-only.
 */
export function Combobox({
  options,
  value,
  onValueChange,
  query,
  onQueryChange,
  placeholder = 'Search…',
  emptyMessage = 'No results — try a wider search',
  loading,
  id,
  ...aria
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [internalQ, setInternalQ] = React.useState('');
  const [active, setActive] = React.useState(0);
  const q = query !== undefined ? query : internalQ;
  const listId = React.useId();

  const filtered =
    query !== undefined
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const setQ = (v: string) => {
    if (query === undefined) setInternalQ(v);
    onQueryChange?.(v);
    setOpen(true);
    setActive(0);
  };
  const choose = (o: ComboboxOption) => {
    onValueChange?.(o.value);
    setQ(o.label);
    setOpen(false);
  };

  return (
    <div
      style={{ position: 'relative', inlineSize: '100%' }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <div className="dtn-input">
        <span className="dtn-input__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <input
          id={id}
          className="dtn-input__el"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-label={aria['aria-label']}
          aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined}
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && filtered[active]) {
              e.preventDefault();
              choose(filtered[active]);
            } else if (e.key === 'Escape') setOpen(false);
          }}
        />
        {q && (
          <button className="dtn-input__btn" aria-label="Clear" onClick={() => setQ('')}>
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="dtn-popover"
          style={{ position: 'absolute', insetBlockStart: 'calc(100% + 4px)' }}
        >
          {loading ? (
            <li className="dtn-empty">Searching…</li>
          ) : filtered.length === 0 ? (
            <li className="dtn-empty">{emptyMessage}</li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={o.value === value}
                data-active={i === active}
                className="dtn-option"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
              >
                <span style={{ flex: 1 }}>
                  {o.label}
                  {o.sublabel && (
                    <span
                      style={{
                        color: 'var(--color-text-muted)',
                        font: 'var(--type-caption)',
                        display: 'block',
                      }}
                    >
                      {o.sublabel}
                    </span>
                  )}
                </span>
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
            ))
          )}
        </ul>
      )}
    </div>
  );
}
