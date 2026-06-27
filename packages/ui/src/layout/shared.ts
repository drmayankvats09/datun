import type * as React from 'react';

/**
 * Shared types + helpers for the layout primitives (Design System Part 4.8).
 *
 * The primitives are thin, token-only React wrappers over the locked layout
 * utility classes authored in `styles/tokens/spacing.css` (`.stack`, `.cluster`,
 * `.grid-auto`, `.center`, `.section`, `.inset*`, `.bleed`). They never invent
 * geometry — they only forward design tokens into the CSS custom properties those
 * classes already read (`--stack-space`, `--grid-min`, `--measure`, …). This keeps
 * the whole system token-only (Part 17.14 "the law": no raw px/hex) and RSC-safe
 * (no client JS).
 */

/**
 * A spacing token from the locked 4px-base / 8px-rhythm scale (Part 4.2).
 * Both the numeric steps (`--space-24`) and the semantic aliases (`--space-lg`)
 * resolve through {@link spaceVar}.
 */
export type SpaceToken =
  | '0'
  | '2'
  | '4'
  | '8'
  | '12'
  | '16'
  | '20'
  | '24'
  | '32'
  | '40'
  | '48'
  | '56'
  | '64'
  | '80'
  | '96'
  | '128'
  | '2xs'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl';

/** Resolve a spacing token to its locked CSS custom property. */
export const spaceVar = (token: SpaceToken): string => `var(--space-${token})`;

/** Container max-width tokens (Part 4.7). Widths are fluid; these are the ceilings. */
export type ContainerSize = 'prose' | 'app' | 'content' | 'wide';

/** Cross-axis alignment, mapped to flexbox values. */
export type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
/** Main-axis distribution, mapped to flexbox values. */
export type Justify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

const ALIGN: Record<Align, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

const JUSTIFY: Record<Justify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

export const alignValue = (a?: Align): string | undefined => (a ? ALIGN[a] : undefined);
export const justifyValue = (j?: Justify): string | undefined => (j ? JUSTIFY[j] : undefined);

/**
 * Merge token-derived CSS custom properties (and plain CSS values) into a single
 * style object, dropping `undefined` entries. The primitive's own prop-driven
 * values are authoritative, so they are applied AFTER (and win over) any caller
 * `style` with the same key. Returns a value cast to {@link React.CSSProperties}
 * so custom properties (`--*`) type-check.
 */
export const styleVars = (
  vars: Record<string, string | undefined>,
  style?: React.CSSProperties,
): React.CSSProperties => {
  const out: Record<string, unknown> = { ...style };
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) out[key] = value;
  }
  return out as React.CSSProperties;
};
