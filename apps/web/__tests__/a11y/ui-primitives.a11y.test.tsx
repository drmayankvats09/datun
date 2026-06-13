// ═══════════════════════════════════════════════════════════════
// UI PRIMITIVES — COMPONENT-LEVEL WCAG AUDIT (Task #54, Layer 2)
// apps/web/__tests__/a11y/ui-primitives.a11y.test.tsx
//
// WHY AUDIT PRIMITIVES WHEN E2E AUDITS PAGES?
//   Pages are combinations; primitives are the genes. A labeling or
//   ARIA defect in components/ui ships to every surface that
//   composes it — patient app today, apps/clinics on day one of
//   Tasks #76–99. Catching it HERE costs one red unit test in 2
//   seconds; catching it in E2E costs a built app + booted server;
//   catching it in production costs a blind patient their
//   consultation. This suite is the cheapest insurance in the repo.
//
// PORTAL MECHANICS (Dialog / Sheet / AlertDialog)
//   Radix portals render into document.body, OUTSIDE the RTL
//   container — so those audits pass no container and let axe scan
//   document.body (the default — where portals mount), keeping
//   page-chrome rules (title/lang) in E2E's jurisdiction.
//   Each renders with open + the Title/Description anatomy Radix's
//   own a11y contract requires; the existing afterEach(cleanup) in
//   __tests__/setup.ts unmounts portals between tests, so document-
//   wide audits never bleed into each other.
//
// RUNNER WIRING (verified 2026-06-12)
//   vitest.config.ts include pattern `**/__tests__/**/*.test.{ts,tsx}`
//   picks this file up automatically → it runs inside the EXISTING
//   `pnpm test` step of ci.yml's quality job. Layer 2 needed zero
//   CI surgery — that's the architecture working as designed.
// ═══════════════════════════════════════════════════════════════

import { describe, it } from 'vitest';
import { render } from '@testing-library/react';

import { expectNoA11yViolations } from './axe';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

describe('UI primitives — WCAG 2.2 AA (axe, component level)', () => {
  it('Button: every variant renders without violations', async () => {
    const variants = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const;

    const { container } = render(
      <div>
        {variants.map((variant) => (
          <Button key={variant} variant={variant}>
            {`Save (${variant})`}
          </Button>
        ))}
        {/* Icon-only is the labeling trap — the aria-label IS the
            accessible name; remove it and this test goes red. */}
        <Button size="icon" aria-label="Close notifications">
          <svg aria-hidden="true" viewBox="0 0 16 16" />
        </Button>
      </div>,
    );

    await expectNoA11yViolations(container);
  });

  it('Input + Label: the htmlFor pairing satisfies labeling rules', async () => {
    const { container } = render(
      <div>
        <Label htmlFor="patient-email">Email</Label>
        <Input id="patient-email" type="email" autoComplete="email" placeholder="you@example.com" />
      </div>,
    );

    await expectNoA11yViolations(container);
  });

  it('Alert: title + description anatomy announces correctly', async () => {
    const { container } = render(
      <Alert>
        <AlertTitle>Consultation saved</AlertTitle>
        <AlertDescription>A copy has been sent to your WhatsApp.</AlertDescription>
      </Alert>,
    );

    await expectNoA11yViolations(container);
  });

  it('Skeleton: both loading variants are inert to assistive tech', async () => {
    const { container } = render(
      <div>
        <Skeleton className="h-4 w-32" />
        <Skeleton variant="shimmer" className="h-4 w-32" />
      </div>,
    );

    await expectNoA11yViolations(container);
  });

  it('Dialog (open): full anatomy passes a document-wide audit', async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete consultation?</DialogTitle>
            <DialogDescription>
              This removes the consultation and its PDF permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button variant="destructive">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    // Portal renders into document.body — audit the document.
    await expectNoA11yViolations();
  });

  it('Sheet (open): side panel anatomy passes a document-wide audit', async () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Narrow the consultation history list.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    await expectNoA11yViolations();
  });

  it('AlertDialog (open): confirm pattern passes a document-wide audit', async () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out everywhere?</AlertDialogTitle>
            <AlertDialogDescription>
              Active sessions on all devices will end immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay signed in</AlertDialogCancel>
            <AlertDialogAction>Sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    await expectNoA11yViolations();
  });
});
