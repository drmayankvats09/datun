'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import type { ChartState } from './chart-tokens';

/**
 * ChartFrame — Part 19.7/19.10/19.11. Shared shell every Datun chart wraps:
 * title (what + unit) · the SVG chart (role=img + summary) · a data-table
 * fallback (view/download data) · and the four chart states (loading =
 * skeleton-in-the-chart's-shape, NOT a spinner · empty · error · insufficient).
 * Copy is never "AI" (Part 12.4).
 */
export interface ChartFrameProps {
  title: string;
  /** Unit / context shown under the title. */
  unit?: string;
  /** Concise summary → the chart's accessible description + screen-reader text. */
  summary: string;
  state?: ChartState;
  onRetry?: () => void;
  /** Optional data-table fallback (rows) for a11y + "view data". */
  table?: { columns: string[]; rows: (string | number)[][] };
  children: React.ReactNode;
  className?: string;
}

export function ChartFrame({
  title,
  unit,
  summary,
  state = 'ready',
  onRetry,
  table,
  children,
  className,
}: ChartFrameProps) {
  const [showTable, setShowTable] = React.useState(false);
  return (
    <figure className={cn('dtn-chart', className)}>
      <figcaption className="dtn-chart__head">
        <div>
          <span className="dtn-chart__title">{title}</span>
          {unit && <span className="dtn-chart__unit">{unit}</span>}
        </div>
        {table && state === 'ready' && (
          <button
            type="button"
            className="dtn-chart__toggle"
            aria-pressed={showTable}
            onClick={() => setShowTable((s) => !s)}
          >
            {showTable ? 'View chart' : 'View data'}
          </button>
        )}
      </figcaption>

      {state === 'ready' && !showTable && (
        <div className="dtn-chart__body" role="img" aria-label={`${title}. ${summary}`}>
          {children}
          <span className="dtn-sr-only">{summary}</span>
        </div>
      )}

      {state === 'ready' && showTable && table && (
        <table className="dtn-table dtn-chart__table">
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {state === 'loading' && (
        <div className="dtn-chart__skeleton" aria-busy="true" aria-label="Loading chart" />
      )}
      {state === 'empty' && (
        <div className="dtn-chart__state">
          <p>No data yet</p>
          <span>Complete an assessment and your trend will appear here.</span>
        </div>
      )}
      {state === 'insufficient' && (
        <div className="dtn-chart__state">
          <p>Not enough data</p>
          <span>We need at least two check-ins to show a trend.</span>
        </div>
      )}
      {state === 'error' && (
        <div className="dtn-chart__state">
          <p>Couldn’t load this chart</p>
          {onRetry && (
            <button type="button" className="dtn-chart__retry" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      )}
    </figure>
  );
}
