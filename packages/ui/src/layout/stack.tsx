import * as React from 'react';
import { cn } from '../lib/cn';
import { type Align, alignValue, type SpaceToken, spaceVar, styleVars } from './shared';

export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  /** Element/component to render as. Defaults to `div`. */
  as?: React.ElementType;
  /**
   * Vertical rhythm between direct children (the `--stack-space` token).
   * Defaults to the locked `16` step when omitted.
   */
  space?: SpaceToken;
  /** Cross-axis (horizontal) alignment of children. */
  align?: Align;
}

/**
 * Stack — vertical flow primitive (Part 4.8).
 *
 * Lays children out in a single column with a consistent, token-driven gap
 * between them (owns the "space between", nothing else). Composes the locked
 * `.stack` utility; pure presentational, so it is RSC-safe (no `use client`).
 *
 * @example
 * <Stack space="24" align="start">…</Stack>
 */
export const Stack = ({
  as: Tag = 'div',
  space,
  align,
  className,
  style,
  children,
  ...props
}: StackProps) => (
  <Tag
    className={cn('stack', className)}
    style={styleVars(
      {
        '--stack-space': space ? spaceVar(space) : undefined,
        alignItems: alignValue(align),
      },
      style,
    )}
    {...props}
  >
    {children}
  </Tag>
);
Stack.displayName = 'Stack';
