import * as React from 'react';

import { cn } from '@/lib/utils';
import { Shake } from '@/components/motion';

// ═══════════════════════════════════════════════════════════════
// INPUT — text-input primitive (shadcn/ui base) + Task #50 shake
//
// Task #50 update:
//   When `shake` is true (the default) and `aria-invalid` is truthy,
//   the input shakes horizontally on the false → true transition.
//   The pattern is universal in banking apps (HDFC, Kotak), iOS
//   keychain, every Stripe form — a subtle "no" body-language that
//   catches the eye in ways red text alone does not.
//
//   Opt out per-input with `shake={false}` when the wrapper div
//   would conflict with a parent layout (rare; the wrapper is
//   `display: block` and shouldn't disrupt typical form rows).
//
//   The Shake component handles edge-detection (only fires on
//   false → true; consecutive true renders are ignored) and ARIA-
//   live announcement.
// ═══════════════════════════════════════════════════════════════

type NativeInputProps = React.ComponentProps<'input'>;

interface InputProps extends NativeInputProps {
  /** When true (default), the input shakes on aria-invalid transitions. */
  shake?: boolean;
  /** Screen-reader text announced when shake fires.
   *  Defaults to "Validation error". Override for context-specific
   *  hints e.g. "Invalid OTP", "Phone number not recognised". */
  shakeAnnounceText?: string;
}

function Input({ className, type, shake = true, shakeAnnounceText, ...props }: InputProps) {
  // Read aria-invalid from native props. Accept both boolean and
  // 'true' / 'false' string forms (React allows both).
  const ariaInvalidProp = props['aria-invalid'];
  const isInvalid = ariaInvalidProp === true || ariaInvalidProp === 'true';

  const inputEl = (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );

  if (!shake) return inputEl;

  return (
    <Shake trigger={isInvalid} announceText={shakeAnnounceText}>
      {inputEl}
    </Shake>
  );
}

export { Input };
export type { InputProps };
