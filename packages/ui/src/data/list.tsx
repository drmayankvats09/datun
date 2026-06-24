import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun List / ListItem — Part 15.11 + Part 8. Semantic <ul>/<li>. Anatomy:
 * avatar (14.8) + title + meta + ONE trailing action. Dividers = border-subtle.
 * Interactive item = whole-item link OR one trailing CTA (no nested-interactive
 * trap). States hover/focus-visible/selected — never colour-alone (Part 8.6).
 */
export interface ListProps extends React.HTMLAttributes<HTMLUListElement> {
  /** Hairline dividers between items (Part 8). @default true */
  dividers?: boolean;
}
export function List({ dividers = true, className, ...props }: ListProps) {
  return <ul className={cn('dtn-list', dividers && 'dtn-list--dividers', className)} {...props} />;
}

export interface ListItemProps extends Omit<React.LiHTMLAttributes<HTMLLIElement>, 'title'> {
  leading?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Whole item is a link → renders an <a>; the trailing slot must then be non-interactive. */
  href?: string;
  selected?: boolean;
}
export function ListItem({
  leading,
  title,
  meta,
  trailing,
  href,
  selected,
  className,
  ...props
}: ListItemProps) {
  const interactive = !!href;
  const inner = (
    <>
      {leading && <span className="dtn-li__lead">{leading}</span>}
      <span className="dtn-li__text">
        <span className="dtn-li__title">{title}</span>
        {meta && <span className="dtn-li__meta">{meta}</span>}
      </span>
      {trailing && <span className="dtn-li__trail">{trailing}</span>}
    </>
  );
  return (
    <li
      className={cn('dtn-li', selected && 'dtn-li--selected', className)}
      aria-current={selected ? 'true' : undefined}
      {...props}
    >
      {interactive ? (
        <a className="dtn-li__link" href={href}>
          {inner}
        </a>
      ) : (
        <div className="dtn-li__row">{inner}</div>
      )}
    </li>
  );
}
