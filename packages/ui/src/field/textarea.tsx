import * as React from 'react';
import { cn } from '../lib/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  /** Auto-grow to content (the symptom free-text). */
  autoGrow?: boolean;
}

/**
 * Datun Textarea — Part 15.4. The symptom free-text (consult front door).
 * Auto-grow, ≥16px font, token-only. Compose inside <Field> (label + char-count).
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, autoGrow, onInput, rows = 3, ...props }, ref) => {
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoGrow) {
        const el = e.currentTarget;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
      }
      onInput?.(e);
    };
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn('dtn-textarea', invalid && 'dtn-input--error', className)}
        aria-invalid={invalid || undefined}
        onInput={handleInput}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
