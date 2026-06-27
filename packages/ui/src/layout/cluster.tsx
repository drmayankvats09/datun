import * as React from 'react';
import { cn } from '../lib/cn';
import {
  type Align,
  alignValue,
  type Justify,
  justifyValue,
  type SpaceToken,
  spaceVar,
  styleVars,
} from './shared';

export interface ClusterProps extends React.HTMLAttributes<HTMLElement> {
  /** Element/component to render as. Defaults to `div`. */
  as?: React.ElementType;
  /** Gap between items, both axes (the `--cluster-space` token). Defaults to `12`. */
  space?: SpaceToken;
  /** Cross-axis alignment (the `--cluster-align` token). Defaults to `center`. */
  align?: Align;
  /** Main-axis distribution. */
  justify?: Justify;
}

/**
 * Cluster — horizontal group primitive (Part 4.8).
 *
 * Lays items in a row that wraps gracefully, with an even token-driven gap. Use
 * for tag rows, button rows, meta lines, eyebrows, anything that should flow and
 * wrap instead of overflowing. Composes the locked `.cluster` utility; RSC-safe.
 *
 * @example
 * <Cluster space="8" justify="between">…</Cluster>
 */
export const Cluster = ({
  as: Tag = 'div',
  space,
  align,
  justify,
  className,
  style,
  children,
  ...props
}: ClusterProps) => (
  <Tag
    className={cn('cluster', className)}
    style={styleVars(
      {
        '--cluster-space': space ? spaceVar(space) : undefined,
        '--cluster-align': alignValue(align),
        justifyContent: justifyValue(justify),
      },
      style,
    )}
    {...props}
  >
    {children}
  </Tag>
);
Cluster.displayName = 'Cluster';
