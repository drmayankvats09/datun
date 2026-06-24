import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Progress — Part 15.10. Determinate / honest bar for >10s or staged ops
 * (the staged assessment + the PDF report build). role="progressbar" with
 * aria-valuenow/min/max; an optional stage label. Transform-based fill (Part 9).
 */
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Omit for an indeterminate (rare) bar. */
  value?: number;
  label?: React.ReactNode;
  /** e.g. "Step 2 of 4" or "Building your report". */
  stage?: React.ReactNode;
}

export function Progress({ value, label, stage, className, ...props }: ProgressProps) {
  const determinate = typeof value === 'number';
  const pct = determinate ? Math.max(0, Math.min(100, value!)) : undefined;
  return (
    <div className={cn('dtn-progress', className)} {...props}>
      {(label || stage) && (
        <div className="dtn-progress__meta">
          {label && <span className="dtn-progress__label">{label}</span>}
          {stage && <span className="dtn-progress__stage">{stage}</span>}
        </div>
      )}
      <div
        className={cn('dtn-progress__track', !determinate && 'dtn-progress__track--indeterminate')}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={determinate ? 0 : undefined}
        aria-valuemax={determinate ? 100 : undefined}
        aria-label={typeof label === 'string' ? label : 'Progress'}
      >
        <div
          className="dtn-progress__fill"
          style={determinate ? { transform: `scaleX(${pct! / 100})` } : undefined}
        />
      </div>
    </div>
  );
}
