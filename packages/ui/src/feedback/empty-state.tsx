import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Empty State — Part 15.10 + Part 14.12. Context → CTA → on-brand spot
 * illustration. Never a blank screen (15.13). The illustration is decorative
 * (aria-hidden); the message + action carry meaning.
 */
export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  illustration?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn('dtn-empty', className)} {...props}>
      {illustration && (
        <div className="dtn-empty__art" aria-hidden="true">
          {illustration}
        </div>
      )}
      <h3 className="dtn-empty__title">{title}</h3>
      {description && <p className="dtn-empty__desc">{description}</p>}
      {action && <div className="dtn-empty__action">{action}</div>}
    </div>
  );
}
