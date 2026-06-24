import * as React from 'react';
import { Slot } from '../lib/slot';
import { cn } from '../lib/cn';
import { buttonVariants, type ButtonVariantProps } from './button.variants';

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<ButtonVariantProps, 'iconOnly' | 'block'> {
  /** Render as the child element (polymorphism via Radix Slot). */
  asChild?: boolean;
  /** Leading icon (Phosphor). Icon + label by default — Part 10.9. */
  leadingIcon?: React.ReactNode;
  /** Trailing icon (Phosphor). */
  trailingIcon?: React.ReactNode;
  /** Icon-only button — REQUIRES `aria-label`. Square at control height. */
  iconOnly?: boolean;
  /** Full-width on mobile (Part 5.6). Pair with size for the hero CTA. */
  block?: boolean;
  /** Loading: inline spinner, label persists, blocks double-tap. */
  loading?: boolean;
}

/**
 * Datun Button — Part 15.3, full 9-part contract, token-only.
 * Variants: primary · secondary · ghost · destructive · link · overlay (+ iconOnly).
 * Sizes: sm 40 · md 48 (default) · lg 56. Pill radius. Verb-first labels
 * ("Ask Datun", "Book appointment") — never "Submit"/"OK"; never "Analyzing with AI".
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      leadingIcon,
      trailingIcon,
      iconOnly = false,
      block = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    if (iconOnly && !props['aria-label']) {
      // a11y guard (Part 13): icon-only must have an accessible name
      if (process.env.NODE_ENV !== 'production')
        console.warn('Datun Button: iconOnly requires an aria-label.');
    }
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, iconOnly, block }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <span className="dtn-btn__spinner" aria-hidden="true" />}
        {!loading && leadingIcon}
        {children}
        {!loading && trailingIcon}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
