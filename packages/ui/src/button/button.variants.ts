import { cva, type VariantProps } from '../lib/cva';

/**
 * Datun Button variants (CVA) — Part 15.3. Token-only utilities; values resolve
 * to the locked design tokens via packages/ui datun-theme.css. No magic numbers.
 *
 * NOTE: the utility class names below are Datun semantic utilities mapped to the
 * locked CSS vars (see datun-theme.css). The hand-compiled equivalent for preview
 * lives in components/button/button.css.
 */
export const buttonVariants = cva(
  // base — inline-flex root, icon+label gap, pill radius, label type, press + focus
  'dtn-btn inline-flex items-center justify-center gap-2 rounded-button whitespace-nowrap ' +
    'font-semibold transition-colors select-none ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] ' +
    'disabled:pointer-events-none disabled:opacity-[var(--alpha-disabled)] ' +
    'aria-busy:pointer-events-none motion-safe:active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary:
          'dtn-btn--primary bg-[var(--color-bg-brand)] text-[var(--color-text-on-brand)] hover:bg-[var(--color-bg-brand-hover)] active:bg-[var(--color-bg-brand-pressed)]',
        secondary:
          'dtn-btn--secondary bg-[var(--color-bg-brand-weak)] text-[var(--color-text-link)]',
        ghost: 'dtn-btn--ghost text-[var(--color-text-link)] hover:bg-[var(--color-bg-brand-weak)]',
        destructive:
          'dtn-btn--destructive bg-[var(--color-error)] text-[var(--color-text-on-brand)]',
        link: 'dtn-btn--link text-[var(--color-text-link)] underline-offset-4 hover:underline',
        overlay: 'dtn-btn--overlay text-white backdrop-blur',
      },
      size: {
        sm: 'dtn-btn--sm h-[var(--control-sm)] px-4 text-[length:var(--text-label-m)]',
        md: 'dtn-btn--md h-[var(--control-md)] px-6',
        lg: 'dtn-btn--lg h-[var(--control-lg)] px-8 text-[length:var(--text-label-l)]',
      },
      iconOnly: { true: 'dtn-btn--icon aspect-square px-0', false: '' },
      block: { true: 'dtn-btn--block w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', iconOnly: false, block: false },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
