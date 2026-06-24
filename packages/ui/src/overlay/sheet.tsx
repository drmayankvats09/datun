'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { useScrollLock } from '../lib/use-scroll-lock';

/**
 * Datun Bottom Sheet — Part 15.9 + Part 11. The consult-flow container on mobile.
 * Native `<dialog>` (top layer, focus-trap, Esc, inert background, scrim) rising from
 * the bottom (Part 9). Tokens: top radius 2xl 28 / bottom 0, L4 shadow-xl.
 * Gesture-alternative (Part 13.8): a visible grabber + an always-present Close button —
 * swipe-down is an ENHANCEMENT, never the only way out. Optional snap points.
 */
export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Fractions of viewport height, e.g. [0.5, 0.92]. Last = expanded. */
  snapPoints?: number[];
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
  snapPoints = [0.6, 0.94],
  className,
}: SheetProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const [snap, setSnap] = React.useState<number>(snapPoints[0] ?? 0.6);
  const drag = React.useRef<{ y: number; h: number } | null>(null);
  useScrollLock(open);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setSnap(snapPoints[0] ?? 0.6);
    } else if (!open && el.open) el.close();
  }, [open, snapPoints]);

  const height = `${Math.round(snap * 100)}vh`;

  // Swipe-down to dismiss / snap (pointer-based; keyboard + Close button always work).
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, h: snap };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y;
    const next = drag.current.h - dy / window.innerHeight;
    setSnap(Math.max(0.25, Math.min(snapPoints[snapPoints.length - 1] ?? 0.94, next)));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    if (snap < 0.34) onOpenChange(false);
    else {
      const nearest = snapPoints.reduce((a, b) =>
        Math.abs(b - snap) < Math.abs(a - snap) ? b : a,
      );
      setSnap(nearest);
    }
    drag.current = null;
  };

  return (
    <dialog
      ref={ref}
      className={cn('dtn-sheet', className)}
      aria-labelledby={titleId}
      style={{ ['--sheet-h' as string]: height }}
      onCancel={(e) => {
        e.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => open && onOpenChange(false)}
    >
      <div className="dtn-sheet__panel">
        <div
          className="dtn-sheet__grab"
          role="separator"
          aria-label="Drag to resize, or use Close"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <span className="dtn-sheet__grabber" />
        </div>
        <header className="dtn-sheet__head">
          <h2 id={titleId} className="dtn-sheet__title">
            {title}
          </h2>
          <button
            type="button"
            className="dtn-sheet__close"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="20" height="20">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className="dtn-sheet__body">{children}</div>
        {footer && <footer className="dtn-sheet__foot">{footer}</footer>}
      </div>
    </dialog>
  );
}
