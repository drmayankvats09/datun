'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Alert / Banner — Part 15.10 + Part 2 + Part 12.6/12.8.
 * Semantic, composed colours; persistent + optionally dismissible; inline for form
 * errors. Colour is NEVER alone — every tone carries an icon + a heading.
 *
 * ⚠️ EMERGENCY / RED-FLAG variant (03 safety-critical): a prominent, calm-but-unmissable
 * banner shown when the consult detects red-flag symptoms — it advises URGENT in-person /
 * emergency care (telemedicine "emergency → advise in-person" rule + medical-safety
 * language 12.6). Never alarming-graphic, never hidden, one clear action.
 */
export type AlertTone = 'info' | 'success' | 'warning' | 'error' | 'emergency';

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: AlertTone;
  title: React.ReactNode;
  /** Primary action (e.g. "Call emergency services", "Find urgent care"). */
  action?: React.ReactNode;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const DEFAULT_ICON: Record<AlertTone, React.ReactNode> = {
  info: (
    <path
      d="M12 8h.01M11 12h1v4h1"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  success: (
    <path
      d="M20 6 9 17l-5-5"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  warning: (
    <path
      d="M12 9v4m0 3h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  error: (
    <path
      d="M12 8v5m0 3h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  emergency: (
    <path
      d="M12 7v5m0 3h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

export function Alert({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
  icon,
  className,
  ...props
}: AlertProps) {
  // Emergency speaks immediately to assistive tech; others are polite.
  const live = tone === 'emergency' || tone === 'error' ? 'assertive' : 'polite';
  return (
    <div
      className={cn('dtn-alert', `dtn-alert--${tone}`, className)}
      role={tone === 'emergency' || tone === 'error' ? 'alert' : 'status'}
      aria-live={live}
      {...props}
    >
      <span className="dtn-alert__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
          {icon ?? DEFAULT_ICON[tone]}
        </svg>
      </span>
      <div className="dtn-alert__content">
        <p className="dtn-alert__title">{title}</p>
        {children && <div className="dtn-alert__body">{children}</div>}
        {action && <div className="dtn-alert__actions">{action}</div>}
      </div>
      {onDismiss && (
        <button type="button" className="dtn-alert__close" aria-label="Dismiss" onClick={onDismiss}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="18" height="18">
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
