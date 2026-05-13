// apps/web/app/[locale]/admin/security/components/violation-table.tsx
// ═══════════════════════════════════════════════════════════════
// VIOLATION TABLE — Reusable table for both dashboard preview + full list
// ═══════════════════════════════════════════════════════════════

'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** Row shape — mirrors API GET /admin/security/violations select fields. */
export interface ViolationRow {
  id: string;
  blockedUri: string;
  documentUri: string;
  effectiveDirective: string;
  violatedDirective: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  disposition: string;
  dedupCount: number;
  createdAt: string; // ISO
}

interface Props {
  rows: ViolationRow[];
  onRowClick?: (id: string) => void;
}

const SEVERITY_VARIANT: Record<ViolationRow['severity'], string> = {
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
  high: 'bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300',
  medium: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300',
  low: 'bg-muted text-muted-foreground border-muted-foreground/20',
};

function truncate(s: string, max: number): string {
  if (!s) return '—';
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ViolationTable({ rows, onRowClick }: Props) {
  const t = useTranslations('admin.security');

  if (rows.length === 0) {
    return (
      <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
        {t('emptyState')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">{t('colSeverity')}</TableHead>
            <TableHead className="w-36">{t('colDirective')}</TableHead>
            <TableHead>{t('colBlockedUri')}</TableHead>
            <TableHead>{t('colDocumentUri')}</TableHead>
            <TableHead className="w-20 text-right">{t('colCount')}</TableHead>
            <TableHead className="w-28 text-right">{t('colTime')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
              onClick={onRowClick ? () => onRowClick(row.id) : undefined}
              tabIndex={onRowClick ? 0 : -1}
              onKeyDown={
                onRowClick
                  ? (e: React.KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row.id);
                      }
                    }
                  : undefined
              }
            >
              <TableCell>
                <Badge variant="outline" className={SEVERITY_VARIANT[row.severity]}>
                  {row.severity}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{row.effectiveDirective}</TableCell>
              <TableCell className="font-mono text-xs">{truncate(row.blockedUri, 60)}</TableCell>
              <TableCell className="font-mono text-xs">{truncate(row.documentUri, 50)}</TableCell>
              <TableCell className="text-right tabular-nums">{row.dedupCount}</TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {formatRelativeTime(row.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
