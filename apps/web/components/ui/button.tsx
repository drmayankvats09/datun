// ═══════════════════════════════════════════════════════════════
// BUTTON — shadcn/Radix primitive, Datun-tuned variants
//
// TASK #54 CONTRACT — WCAG 2.2 SC 2.5.8 Target Size (Minimum)
//   Every interactive pointer target MUST be ≥ 24×24 CSS pixels.
//   This file is the single source of truth for button hit-boxes,
//   so the floor is enforced HERE, by audit, for every size token:
//
//     size        height        width                 verdict
//     ──────────  ────────────  ────────────────────  ─────────
//     xs          h-6  = 24px   px-2 + content ≥ 24   PASS (floor)
//     sm          h-7  = 28px   px-2.5 + content      PASS
//     default     h-8  = 32px   px-2.5 + content      PASS
//     lg          h-9  = 36px   px-2.5 + content      PASS
//     icon-xs     size-6 = 24×24                      PASS (floor)
//     icon-sm     size-7 = 28×28                      PASS
//     icon        size-8 = 32×32                      PASS
//     icon-lg     size-9 = 36×36                      PASS
//
//   (Math: Tailwind spacing scale — 1 unit = 4px, so h-6 = 24px.
//    Audited 2026-06-12; recorded in ADR-0010.)
//
//   RULES FOR FUTURE EDITS — breaking these breaks the CI a11y gate
//   and, more importantly, breaks tap targets for patients with
//   tremor or low vision on ₹10K phones:
//     1. NEVER add a size variant whose hit-box can fall below
//        24×24 (no h-5, no size-5). `xs`/`icon-xs` sit EXACTLY on
//        the floor — there is zero headroom below them.
//     2. Spacing exception abuse is not a loophole: SC 2.5.8 allows
//        undersized targets only when surrounded by enough empty
//        offset — our design system does not rely on that exception
//        and PRs must not start.
//     3. Inline-text links (`variant="link"` flowing inside a
//        sentence) are exempt per the SC's "inline" exception —
//        the exemption applies to the variant's PROSE usage, not to
//        standalone link-styled buttons.
//     4. One-off interactive elements built OUTSIDE these variants
//        (chat chips — Task #56, custom controls) must apply the
//        `.min-target` utility from app/globals.css.
//
//   Zero behavioral change in this update — documentation contract
//   only. Focus styling note: `focus-visible:ring-ring/50` (soft
//   halo) layers on `focus-visible:border-ring` (solid 1px) — the
//   solid border is what carries WCAG 1.4.11's 3:1 indicator
//   contrast, via the --ring token fixed in globals.css (Task #54).
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      // Task #54: every size below is ≥ the 24px SC 2.5.8 floor —
      // see the contract table in the header before adding variants.
      size: {
        default:
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        icon: 'size-8',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
