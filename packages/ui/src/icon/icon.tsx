import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Icon primitive — Part 10.4/10.7/10.10/10.14.
 *
 * Wraps a Phosphor icon component (the ONE library, 10.2) and resolves
 * size/weight/colour to LOCKED tokens. `currentColor` by default (inherits the
 * surrounding text token, Part 2.10); semantic colours via `tone`; duotone via
 * Phosphor's own duotone weight + the --icon-fg/--icon-bg tokens.
 *
 * A11y (Part 13 / 10.9): decorative → aria-hidden; meaningful → pass `label`
 * (sets role="img" + aria-label). Icon-only controls must wrap with <IconTarget>
 * for the 48dp tap target (10.7 / Part 5.3).
 *
 * Usage:
 *   import { Tooth, MagnifyingGlass } from "@phosphor-icons/react";
 *   <Icon as={MagnifyingGlass} size="md" label="Search" />
 *   <Icon as={Tooth} weight="fill" tone="brand" />
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type IconTone = 'default' | 'muted' | 'brand' | 'success' | 'warning' | 'error' | 'info';
export type IconWeight = 'regular' | 'fill' | 'duotone';

const SIZE_VAR: Record<IconSize, string> = {
  xs: 'var(--icon-size-xs)',
  sm: 'var(--icon-size-sm)',
  md: 'var(--icon-size-md)',
  lg: 'var(--icon-size-lg)',
  xl: 'var(--icon-size-xl)',
  '2xl': 'var(--icon-size-2xl)',
};

export interface IconProps {
  /** A Phosphor icon component (or any component taking size/weight/color). */
  as: React.ElementType;
  size?: IconSize;
  /** Active Phosphor weights only (10.3). */
  weight?: IconWeight;
  tone?: IconTone;
  /** Accessible name → meaningful icon. Omit for decorative (aria-hidden). */
  label?: string;
  className?: string;
}

export function Icon({
  as: Cmp,
  size = 'md',
  weight = 'regular',
  tone = 'default',
  label,
  className,
}: IconProps) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <Cmp
      // Phosphor reads size + weight + color as props; color inherits text by default.
      size={SIZE_VAR[size]}
      weight={weight}
      color="currentColor"
      className={cn(
        'dtn-icon',
        `dtn-icon--${size}`,
        tone !== 'default' && `dtn-icon--${tone}`,
        weight === 'duotone' && 'dtn-icon--duotone',
        className,
      )}
      {...a11y}
    />
  );
}

/** 48dp hit-area wrapper for icon-only controls (10.7 / Part 5.3). */
export function IconTarget({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('dtn-icon-target', className)} {...props}>
      {children}
    </span>
  );
}
