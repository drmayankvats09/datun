import * as React from 'react';
import { cn } from '../lib/cn';
import { cva, type VariantProps } from '../lib/cva';

const cardVariants = cva('dtn-card', {
  variants: {
    variant: { flat: 'dtn-card--flat', raised: 'dtn-card--raised', elevated: 'dtn-card--elevated' },
    feature: { true: 'dtn-card--feature', false: '' },
  },
  defaultVariants: { variant: 'flat', feature: false },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof cardVariants> {
  /** Whole-card link — renders <a>, ring on focus. NO nested interactive (a11y). */
  href?: string;
  asChild?: boolean;
}

/**
 * Datun Card — Part 15.7. Composition primitives (compose homepage cards FROM these,
 * never bespoke). flat(L0 border) · raised(L1 shadow) · elevated(both). Base radius
 * lg16, feature xl24. A card is EITHER a whole-card link OR a card with one CTA — not both.
 */
export const Card = React.forwardRef<HTMLElement, CardProps>(
  ({ className, variant, feature, href, children, ...props }, ref) => {
    if (href) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={cn(cardVariants({ variant, feature }), 'dtn-card--link', className)}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      );
    }
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(cardVariants({ variant, feature }), className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';

export const CardMedia = ({
  ratio = '16 / 9',
  className,
  children,
  ...p
}: React.HTMLAttributes<HTMLDivElement> & { ratio?: string }) => (
  <div className={cn('dtn-card__media', className)} style={{ aspectRatio: ratio }} {...p}>
    {children}
  </div>
);
export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('dtn-card__header', className)} {...p} />
);
export const CardTitle = ({
  as: Tag = 'h3',
  className,
  ...p
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: React.ElementType }) => (
  <Tag className={cn('dtn-card__title', className)} {...p} />
);
export const CardDescription = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('dtn-card__desc', className)} {...p} />
);
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('dtn-card__content', className)} {...p} />
);
export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('dtn-card__footer', className)} {...p} />
);
