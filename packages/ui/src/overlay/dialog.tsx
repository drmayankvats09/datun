'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { useScrollLock } from '../lib/use-scroll-lock';

/**
 * Datun Dialog / Modal — Part 15.9 + Part 11.4/11.10.
 * Built on the NATIVE top layer: `<dialog>.showModal()` — escapes z-index, auto
 * `::backdrop` scrim, sets aria-modal, makes the rest `inert`, traps focus, Esc closes.
 * Tokens: radius xl 24, L4 shadow-xl, scrim 0.5 (Part 6/7/11). One obvious primary action.
 * Honest (15.1): outside-click dismiss is GUARDED when `destructive`/`unsaved` — the user
 * must use an explicit control. Reserve for decisions that block.
 */
export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Footer actions — keep ONE primary (15.13). */
  footer?: React.ReactNode;
  /** Guards backdrop + Esc dismissal for unsaved/destructive flows (Honest). */
  dismissible?: boolean;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  dismissible = true,
  className,
}: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  useScrollLock(open);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  // Native `cancel` = Esc / backdrop dismissal request.
  const onCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    if (dismissible) onOpenChange(false);
  };
  // Click on the ::backdrop bubbles to the dialog with target === dialog.
  const onClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!dismissible) return;
    if (e.target === ref.current) onOpenChange(false);
  };

  return (
    <dialog
      ref={ref}
      className={cn('dtn-dialog', className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={onCancel}
      onClick={onClick}
      onClose={() => open && onOpenChange(false)}
    >
      <div className="dtn-dialog__panel" role="document">
        <header className="dtn-dialog__head">
          <h2 id={titleId} className="dtn-dialog__title">
            {title}
          </h2>
          <button
            type="button"
            className="dtn-dialog__close"
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
        {description && (
          <p id={descId} className="dtn-dialog__desc">
            {description}
          </p>
        )}
        {children && <div className="dtn-dialog__body">{children}</div>}
        {footer && <footer className="dtn-dialog__foot">{footer}</footer>}
      </div>
    </dialog>
  );
}
