'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  'aria-label'?: string;
  id?: string;
}

/**
 * Datun OTP input — Part 15.4 / 13.7. Segmented, treated as a single string.
 * WebOTP-ready: the first cell carries autoComplete="one-time-code" so the SMS
 * code auto-fills. Accessible auth (never a cognitive-puzzle CAPTCHA).
 */
export const OtpInput = React.forwardRef<HTMLInputElement, OtpInputProps>(
  ({ length = 6, value, onChange, invalid, id, ...aria }, ref) => {
    const refs = React.useRef<(HTMLInputElement | null)[]>([]);
    const chars = value.padEnd(length).slice(0, length).split('');

    const setAt = (i: number, ch: string) => {
      const next = value.split('');
      next[i] = ch;
      onChange(next.join('').slice(0, length));
      if (ch && i < length - 1) refs.current[i + 1]?.focus();
    };

    return (
      <div
        className="dtn-otp"
        role="group"
        aria-label={aria['aria-label'] || 'One-time code'}
        id={id}
      >
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
              if (i === 0 && typeof ref === 'function') ref(el);
            }}
            className={cn('dtn-otp__cell', chars[i]?.trim() && 'dtn-otp__cell--filled')}
            inputMode="numeric"
            maxLength={1}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-invalid={invalid || undefined}
            aria-label={`Digit ${i + 1} of ${length}`}
            value={chars[i]?.trim() || ''}
            onChange={(e) => setAt(i, e.target.value.replace(/\D/g, '').slice(-1))}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !chars[i]?.trim() && i > 0) refs.current[i - 1]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
              if (digits) onChange(digits);
            }}
          />
        ))}
      </div>
    );
  },
);
OtpInput.displayName = 'OtpInput';
