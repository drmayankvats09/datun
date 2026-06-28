import * as React from 'react';
import { cn } from '../lib/cn';
import { type SpaceToken, spaceVar, styleVars } from './shared';

export interface GridProps extends React.HTMLAttributes<HTMLElement> {
  /** Element/component to render as. Defaults to `div`. */
  as?: React.ElementType;
  /**
   * Intrinsic minimum column width (the `--grid-min` token), e.g. `'16rem'`.
   * The grid resolves to `repeat(auto-fit, minmax(min(100%, MIN), 1fr))`, so it
   * flows from 1 to N columns with NO media queries. Defaults to `16rem`.
   */
  min?: string;
  /** Gap between cells (the `--grid-gap` token). Defaults to the desktop gutter. */
  gap?: SpaceToken;
}

/**
 * Grid — intrinsic auto-fit grid primitive (Part 4.8).
 *
 * The workhorse for every card/tile/feature grid on the homepage. Columns are
 * decided by available width, not breakpoints, so the same component is correct
 * at 360px and 1440px with zero media-query patches. Composes the locked
 * `.grid-auto` utility; RSC-safe.
 *
 * @example
 * <Grid min="14rem" gap="24">…cards…</Grid>
 */
export const Grid = ({
  as: Tag = 'div',
  min,
  gap,
  className,
  style,
  children,
  ...props
}: GridProps) => (
  <Tag
    className={cn('grid-auto', className)}
    style={styleVars(
      {
        '--grid-min': min,
        '--grid-gap': gap ? spaceVar(gap) : undefined,
      },
      style,
    )}
    {...props}
  >
    {children}
  </Tag>
);
Grid.displayName = 'Grid';
