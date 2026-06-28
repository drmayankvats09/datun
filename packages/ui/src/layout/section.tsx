import * as React from 'react';
import { cn } from '../lib/cn';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Element/component to render as. Defaults to the semantic `section`. */
  as?: React.ElementType;
}

/**
 * Section — vertical rhythm primitive (Part 4.11 / 4.8).
 *
 * Applies the locked, fluid block padding band `clamp(3rem, 8vw, 6rem)` so every
 * page section breathes consistently from mobile to desktop without breakpoints.
 * Owns vertical rhythm only; pair with `Container` for the horizontal measure.
 * Composes the locked `.section` utility; RSC-safe.
 *
 * @example
 * <Section className="dtn-band--teal"><Container>…</Container></Section>
 */
export const Section = ({ as: Tag = 'section', className, children, ...props }: SectionProps) => (
  <Tag className={cn('section', className)} {...props}>
    {children}
  </Tag>
);
Section.displayName = 'Section';
