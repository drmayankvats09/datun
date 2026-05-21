// apps/web/app/[locale]/admin/security/components/violation-detail-drawer.tsx
// ═══════════════════════════════════════════════════════════════
// VIOLATION DETAIL DRAWER — Slide-out panel with full violation JSON
//
// TASK #51 UPGRADE
// ────────────────
// The previous <Loader2> placeholder rendered as a small centered
// spinner that left the drawer body visually empty during the brief
// detail-fetch window. <DrawerSkeleton> now occupies the same body
// shape (status badge + 15 field rows) so the drawer feels
// substantive from the first frame.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useTranslations } from 'next-intl';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { DrawerSkeleton } from '@/components/feedback/skeletons';

/** Full violation shape — mirrors API GET /admin/security/violations/:id. */
export interface ViolationDetail {
  id: string;
  blockedUri: string;
  documentUri: string;
  violatedDirective: string;
  effectiveDirective: string;
  originalPolicy: string;
  disposition: string;
  statusCode: number | null;
  scriptSample: string | null;
  sourceFile: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  userAgent: string | null;
  ipHash: string;
  requestId: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  dedupCount: number;
  sentryEventId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  open: boolean;
  violation: ViolationDetail | null;
  onOpenChange: (open: boolean) => void;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-2 border-b py-2">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="font-mono text-xs break-all">{value ?? '—'}</div>
    </div>
  );
}

export function ViolationDetailDrawer({ open, violation, onOpenChange }: Props) {
  const t = useTranslations('admin.security.detail');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{t('title')}</SheetTitle>
          <SheetDescription>{t('subtitle')}</SheetDescription>
        </SheetHeader>

        {!violation ? (
          // Drawer body skeleton — 15 fields matches the live field
          // grid below so the layout box stays stable on data arrival.
          <div className="mt-4">
            <DrawerSkeleton fieldCount={15} showBadge={true} />
          </div>
        ) : (
          <div className="mt-4">
            <Badge
              variant="outline"
              className={
                violation.severity === 'critical'
                  ? 'border-destructive/30 bg-destructive/15 text-destructive'
                  : 'border-muted-foreground/20 bg-muted text-muted-foreground'
              }
            >
              {violation.severity}
            </Badge>

            <div className="mt-4 space-y-0">
              <Field label={t('id')} value={violation.id} />
              <Field label={t('createdAt')} value={new Date(violation.createdAt).toISOString()} />
              <Field label={t('dispositionLabel')} value={violation.disposition} />
              <Field label={t('blockedUri')} value={violation.blockedUri} />
              <Field label={t('documentUri')} value={violation.documentUri} />
              <Field label={t('violatedDirective')} value={violation.violatedDirective} />
              <Field label={t('effectiveDirective')} value={violation.effectiveDirective} />
              <Field label={t('dedupCount')} value={violation.dedupCount} />
              <Field label={t('statusCode')} value={violation.statusCode} />
              <Field label={t('sourceFile')} value={violation.sourceFile} />
              <Field
                label={t('lineColumn')}
                value={
                  violation.lineNumber !== null
                    ? `${violation.lineNumber}:${violation.columnNumber ?? 0}`
                    : '—'
                }
              />
              <Field label={t('scriptSample')} value={violation.scriptSample} />
              <Field label={t('userAgent')} value={violation.userAgent} />
              <Field label={t('ipHash')} value={violation.ipHash} />
              <Field label={t('requestId')} value={violation.requestId} />
              <Field label={t('sentryEventId')} value={violation.sentryEventId} />
            </div>

            <details className="mt-6 rounded-md border bg-muted/50 p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                {t('originalPolicy')}
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto text-xs break-all whitespace-pre-wrap">
                {violation.originalPolicy}
              </pre>
            </details>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
