// ═══════════════════════════════════════════════════════════════
// RESPONSIVE TABLE — Desktop: table. Mobile: stacked cards.
// Clinic analytics, lab results, billing — all data tables.
// Pattern: Stripe Dashboard tables, Notion database views.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useBreakpoint } from '@/hooks';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T & string;
  label: string;
  /** Hide this column on mobile cards (show in table only) */
  desktopOnly?: boolean;
}

interface ResponsiveTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  /** Render value for a cell (default: String(value)) */
  renderCell?: (value: unknown, key: string, row: T) => React.ReactNode;
  className?: string;
  /** Key field for React keys */
  keyField?: keyof T & string;
}

export function ResponsiveTable<T extends Record<string, unknown>>({
  data,
  columns,
  renderCell,
  className,
  keyField,
}: ResponsiveTableProps<T>) {
  const { isMobile } = useBreakpoint();

  const render = (value: unknown, key: string, row: T) => {
    if (renderCell) return renderCell(value, key, row);
    return String(value ?? '—');
  };

  // ── Mobile: Card Stack ──
  if (isMobile) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((row, index) => (
          <div
            key={keyField ? String(row[keyField]) : `row-${index}`}
            className="rounded-xl border border-border bg-card p-4"
          >
            {columns
              .filter((col) => !col.desktopOnly)
              .map((col) => (
                <div key={col.key} className="flex items-center justify-between py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
                  <span className="text-sm font-medium text-foreground">
                    {render(row[col.key], col.key, row)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    );
  }

  // ── Desktop: Table ──
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={keyField ? String(row[keyField]) : `row-${index}`}
              className="border-b border-border transition-colors last:border-0 hover:bg-muted/30"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-foreground">
                  {render(row[col.key], col.key, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
