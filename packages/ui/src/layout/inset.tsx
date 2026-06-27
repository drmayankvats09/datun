import * as React from 'react';
import { cn } from '../lib/cn';
import { type SpaceToken, spaceVar, styleVars } from './shared';

export interface InsetProps extends React.HTMLAttributes<HTMLElement> {
  /** Element/component to render as. Defaults to `div`. */
  as?: React.ElementType;
  /**
   * Padding shape:
   * - `even` — equal padding all sides (`.inset`).
   * - `squish` — less block, more inline (`.inset-squish`, good for pills/bars).
   * - `stretch` — more block, less inline (`.inset-stretch`, good for tall cells).
   */
  variant?: 'even' | 'squish' | 'stretch';
  /** Padding amount for the `even` variant (the `--inset` token). Defaults to `16`. */
  space?: SpaceToken;
}

const VARIANT_CLASS: Record<NonNullable<InsetProps['variant']>, string> = {
  even: 'inset',
  squish: 'inset-squish',
  stretch: 'inset-stretch',
};

/**
 * Inset — interior padding primitive (Part 4.8).
 *
 * Adds consistent, token-driven padding inside a box without leaking external
 * margin (Part 4.4). Composes the locked `.inset` / `.inset-squish` /
 * `.inset-stretch` utilities; RSC-safe.
 *
 * @example
 * <Inset variant="squish">…</Inset>
 */
export const Inset = ({
  as: Tag = 'div',
  variant = 'even',
  space,
  className,
  style,
  children,
  ...props
}: InsetProps) => (
  <Tag
    className={cn(VARIANT_CLASS[variant], className)}
    style={styleVars(
      { '--inset': variant === 'even' && space ? spaceVar(space) : undefined },
      style,
    )}
    {...props}
  >
    {children}
  </Tag>
);
Inset.displayName = 'Inset';
