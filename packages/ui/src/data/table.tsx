'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Table — Part 15.11 + Part 5.2. Semantic <table>. control-xs 32 dense rows
 * with ≥44 touch padding, sortable headers (<th scope> + aria-sort), sticky header
 * (L2), zebra optional, pagination handled by the caller. MOBILE: pass `mobile="stack"`
 * to render each row as a labelled card (data-label attrs) below the md breakpoint.
 */
export interface Column<T> {
  key: keyof T & string;
  header: React.ReactNode;
  sortable?: boolean;
  align?: 'start' | 'end';
  render?: (row: T) => React.ReactNode;
}
export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  zebra?: boolean;
  stickyHeader?: boolean;
  /** Mobile rendering below md: keep table (scroll) or stack into cards. @default "stack" */
  mobile?: 'scroll' | 'stack';
  caption?: React.ReactNode;
  className?: string;
}

type SortDir = 'ascending' | 'descending' | 'none';

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  zebra,
  stickyHeader = true,
  mobile = 'stack',
  caption,
  className,
}: TableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [dir, setDir] = React.useState<SortDir>('none');

  const sorted = React.useMemo(() => {
    if (!sortKey || dir === 'none') return rows;
    const c = [...rows].sort((a, b) => ((a[sortKey] as never) > (b[sortKey] as never) ? 1 : -1));
    return dir === 'descending' ? c.reverse() : c;
  }, [rows, sortKey, dir]);

  const onSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setDir('ascending');
      return;
    }
    setDir((d) => (d === 'ascending' ? 'descending' : d === 'descending' ? 'none' : 'ascending'));
  };

  return (
    <div className={cn('dtn-table-wrap', `dtn-table-wrap--${mobile}`)}>
      <table
        className={cn(
          'dtn-table',
          zebra && 'dtn-table--zebra',
          stickyHeader && 'dtn-table--sticky',
          className,
        )}
      >
        {caption && <caption className="dtn-table__caption">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => {
              const aria = col.sortable ? (sortKey === col.key ? dir : 'none') : undefined;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={aria}
                  className={cn(col.align === 'end' && 'dtn-th--end')}
                >
                  {col.sortable ? (
                    <button type="button" className="dtn-th__sort" onClick={() => onSort(col.key)}>
                      {col.header}
                      <svg
                        className={cn(
                          'dtn-th__arrow',
                          sortKey === col.key && dir !== 'none' && `is-${dir}`,
                        )}
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M12 5v14M7 14l5 5 5-5"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  data-label={typeof col.header === 'string' ? col.header : col.key}
                  className={cn(col.align === 'end' && 'dtn-td--end')}
                >
                  {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
