// ═══════════════════════════════════════════════════════════════
// DATA TRAINING CONSENT MODAL — Task #44 Phase 3
//
// DPDP Act 2023 Rule 3 compliance:
//   - Plain-language notice in user's preferred locale
//   - Clear opt-in mechanism (not pre-checked)
//   - Of-equal-simplicity withdrawal (decline button equally prominent)
//   - Itemized what-we-use / what-we-never-use
//   - Reference to consent version + withdrawal route
//
// Records ConsentLog row server-side (purpose=DATA_TRAINING).
// Caller responsible for calling onAgree/onDecline; this is pure UI.
//
// @see docs/dpdp/training-data-dpia.md — full DPIA
// @see packages/db/prisma/schema.prisma — ConsentLog model
// ═══════════════════════════════════════════════════════════════

'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { CONSENT_CURRENT_VERSION } from './consent-copy';

interface DataTrainingConsentModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Called when patient agrees — record ConsentLog GRANTED. */
  onAgree: (version: string) => Promise<void>;
  /** Called when patient declines — record ConsentLog as REVOKED-equivalent (DENIED). */
  onDecline: () => Promise<void>;
  /** Called when modal closes (escape, overlay click). */
  onOpenChange: (open: boolean) => void;
}

export function DataTrainingConsentModal({
  open,
  onAgree,
  onDecline,
  onOpenChange,
}: DataTrainingConsentModalProps) {
  const t = useTranslations('admin.consent.training');

  async function handleAgree() {
    try {
      await onAgree(CONSENT_CURRENT_VERSION);
      toast.success(t('agreedToast'));
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDecline() {
    try {
      await onDecline();
      toast(t('declinedToast'));
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const whatWeUse = t.raw('whatWeUseItems') as readonly string[];
  const whatWeNeverUse = t.raw('whatWeNeverUseItems') as readonly string[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5 text-primary" aria-hidden />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-base">{t('body')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* What we use */}
          <section className="space-y-1.5">
            <h3 className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4" aria-hidden />
              {t('whatWeUse')}
            </h3>
            <ul className="ml-6 list-disc space-y-0.5 text-muted-foreground">
              {whatWeUse.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {/* What we never use */}
          <section className="space-y-1.5">
            <h3 className="flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-400">
              <XCircle className="size-4" aria-hidden />
              {t('whatWeNeverUse')}
            </h3>
            <ul className="ml-6 list-disc space-y-0.5 text-muted-foreground">
              {whatWeNeverUse.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {/* Your rights */}
          <section className="rounded-md border border-border bg-muted/40 p-3">
            <h3 className="mb-1 text-xs font-semibold tracking-wide uppercase">
              {t('yourRights')}
            </h3>
            <p className="text-xs text-muted-foreground">{t('rightsBody')}</p>
          </section>

          <p className="text-xs text-muted-foreground/60">{t('version')}</p>
        </div>

        {/* Buttons — equal simplicity per DPDP Rule 3 */}
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleDecline} className="w-full sm:w-auto">
            {t('decline')}
          </Button>
          <Button onClick={handleAgree} className="w-full sm:w-auto">
            {t('agree')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
