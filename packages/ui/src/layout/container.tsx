import * as React from 'react';
import { cn } from '../lib/cn';
import { type ContainerSize, styleVars } from './shared';

export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  /** Element/component to render as. Defaults to `div`. */
  as?: React.ElementType;
  /**
   * Max-width ceiling (the `--measure` token):
   * - `prose` — 66ch reading measure.
   * - `app` — 40rem single column.
   * - `content` — 75rem marketing (default).
   * - `wide` — 90rem max site.
   * The width itself is fluid; this is only the cap, with auto inline margins
   * and responsive gutters. NEVER a fixed width.
   */
  size?: ContainerSize;
}

/**
 * Container — fluid, centered max-width primitive (Part 4.7 / 4.8).
 *
 * Centers content with auto inline margins and breakpoint-aware gutters, capped
 * at a chosen measure. Owns horizontal rhythm only; pair with `Section` for
 * vertical rhythm. Composes the locked `.center` utility; RSC-safe.
 *
 * @example
 * <Section><Container size="content">…</Container></Section>
 */
export const Container = ({
  as: Tag = 'div',
  size = 'content',
  className,
  style,
  children,
  ...props
}: ContainerProps) => (
  <Tag
    className={cn('center', className)}
    style={styleVars({ '--measure': `var(--container-${size})` }, style)}
    {...props}
  >
    {children}
  </Tag>
);
Container.displayName = 'Container';
