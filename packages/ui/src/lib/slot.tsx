import * as React from 'react';
import { cn } from './cn';

/**
 * Datun Slot — dependency-free Radix-Slot equivalent (vendored) for `asChild`
 * polymorphism. Merges the host's props/className/ref onto the single child
 * element. Swap for @radix-ui/react-slot in the app repo if its full
 * composition (Slottable, multiple slots) is needed.
 */
export const Slot = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }
>(({ children, className, ...props }, ref) => {
  if (!React.isValidElement(children)) return null;
  const child = children as React.ReactElement<Record<string, unknown>>;
  const childClassName = (child.props as { className?: string }).className;
  return React.cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(className, childClassName),
    ref,
  });
});
Slot.displayName = 'Slot';
