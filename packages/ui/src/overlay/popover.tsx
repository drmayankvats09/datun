'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Popover / Menu — Part 15.9 + Part 11.4. NON-MODAL: native Popover API
 * (`popover="auto"`) — native top layer, light-dismiss (click-outside / Esc),
 * focus + a11y wired, no scroll-lock. Tokens: L3 shadow-lg, radius md, z-popover.
 * No nesting (15.9). Anchored to its trigger.
 */
export interface PopoverProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export function Popover({ trigger, children, className, align = 'start' }: PopoverProps) {
  const id = React.useId();
  const popId = `pop-${id}`;
  // Native popover wiring via popovertarget — no JS open/close needed.
  const triggerEl = React.cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
    popovertarget: popId,
    'aria-haspopup': 'menu',
  });
  return (
    <>
      {triggerEl}
      <div
        id={popId}
        popover="auto"
        role="menu"
        className={cn('dtn-popover', `dtn-popover--${align}`, className)}
      >
        {children}
      </div>
    </>
  );
}

export interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
  icon?: React.ReactNode;
}
export function MenuItem({ destructive, icon, children, className, ...props }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn('dtn-menu__item', destructive && 'dtn-menu__item--destructive', className)}
      {...props}
    >
      {icon && (
        <span className="dtn-menu__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
