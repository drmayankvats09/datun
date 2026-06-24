'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Format DD MMM YYYY (Part 12.13). */
export function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export interface DatePickerProps {
  value?: Date;
  onValueChange?: (date: Date) => void;
  /** 12-hr time slots, e.g. ["9:00 AM","9:30 AM"]. */
  slots?: string[];
  selectedSlot?: string;
  onSlotChange?: (slot: string) => void;
  minDate?: Date;
  label?: string;
  id?: string;
}

/**
 * Datun Date/Time picker — Part 15.6. Field trigger + calendar popover (role=grid,
 * arrow-key date nav, dated aria-labels). DD MMM YYYY display, 12-hr slots (Part 12.13).
 * On mobile, open as a bottom-sheet for thumb-reach. Token-only.
 */
export function DatePicker({
  value,
  onValueChange,
  slots,
  selectedSlot,
  onSlotChange,
  minDate,
  label,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(() => value ?? new Date());
  const y = view.getFullYear(),
    m = view.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  const pick = (day: number) => {
    const d = new Date(y, m, day);
    onValueChange?.(d);
  };
  const isSel = (day: number) =>
    value && value.getFullYear() === y && value.getMonth() === m && value.getDate() === day;
  const isPast = (day: number) =>
    minDate &&
    new Date(y, m, day) < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());

  return (
    <div
      style={{ position: 'relative', inlineSize: '100%' }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        id={id}
        className="dtn-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn('dtn-trigger__value', !value && 'dtn-trigger__value--placeholder')}>
          {value ? formatDate(value) : 'DD MMM YYYY'}
        </span>
        <span className="dtn-trigger__chev" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <rect
              x="3.5"
              y="4.5"
              width="17"
              height="16"
              rx="3"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M8 2v4M16 2v4M3.5 9.5h17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      {open && (
        <div
          className="dtn-popover dtn-cal"
          role="dialog"
          aria-label="Choose a date"
          style={{ position: 'absolute', insetBlockStart: 'calc(100% + 4px)', inlineSize: 'auto' }}
        >
          <div className="dtn-cal__head">
            <button
              className="dtn-cal__nav"
              aria-label="Previous month"
              onClick={() => setView(new Date(y, m - 1, 1))}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                  d="m15 18-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span className="dtn-cal__title">
              {MONTHS[m]} {y}
            </span>
            <button
              className="dtn-cal__nav"
              aria-label="Next month"
              onClick={() => setView(new Date(y, m + 1, 1))}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                  d="m9 18 6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className="dtn-cal__grid" role="grid">
            {DOW.map((d, i) => (
              <div key={i} className="dtn-cal__dow" role="columnheader">
                {d}
              </div>
            ))}
            {cells.map((day, i) =>
              day === null ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  className={cn('dtn-cal__day', isSel(day) && 'dtn-cal__day--selected')}
                  role="gridcell"
                  aria-label={formatDate(new Date(y, m, day))}
                  aria-selected={isSel(day) || undefined}
                  disabled={isPast(day) || undefined}
                  onClick={() => pick(day)}
                >
                  {day}
                </button>
              ),
            )}
          </div>
          {slots && slots.length > 0 && (
            <div style={{ marginBlockStart: 'var(--space-12)' }}>
              <div
                className="dtn-cal__dow"
                style={{ textAlign: 'start', marginBlockEnd: 'var(--space-8)' }}
              >
                Available times
              </div>
              <div className="dtn-slots">
                {slots.map((s) => (
                  <button
                    key={s}
                    className={cn('dtn-slot', selectedSlot === s && 'dtn-slot--selected')}
                    onClick={() => onSlotChange?.(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
