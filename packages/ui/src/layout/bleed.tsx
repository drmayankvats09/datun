import * as React from 'react';
import { cn } from '../lib/cn';

export interface BleedProps extends React.HTMLAttributes<HTMLElement> {
  /** Element/component to render as. Defaults to `div`. */
  as?: React.ElementType;
}

/**
 * Bleed — full-viewport-width primitive (Part 4.8).
 *
 * Breaks a child out of its centered container to span the full viewport width
 * (used for tinted section bands, gradient glows, edge-to-edge media) while the
 * surrounding content stays measured. Composes the locked `.bleed` utility
 * (`width: 100vw; margin-inline: calc(50% - 50vw)`); RSC-safe.
 *
 * @example
 * <Bleed className="dtn-band--teal"><Container>…</Container></Bleed>
 */
export const Bleed = ({ as: Tag = 'div', className, children, ...props }: BleedProps) => (
  <Tag className={cn('bleed', className)} {...props}>
    {children}
  </Tag>
);
Bleed.displayName = 'Bleed';
