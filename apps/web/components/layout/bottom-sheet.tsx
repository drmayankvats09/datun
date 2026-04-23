// ═══════════════════════════════════════════════════════════════
// BOTTOM SHEET — Mobile: drawer from bottom. Desktop: modal.
// Consultation actions, filters, cart — sab bottom sheet mein.
// Pattern: Zomato, Google Maps, Apple Maps.
// Uses shadcn Sheet (mobile) / Dialog (desktop).
// ═══════════════════════════════════════════════════════════════

'use client';

import { useBreakpoint } from '@/hooks';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: BottomSheetProps) {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="mt-4 overflow-y-auto">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
