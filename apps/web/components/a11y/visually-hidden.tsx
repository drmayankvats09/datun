// ═══════════════════════════════════════════════════════════════
// VISUALLY HIDDEN — Screen reader only text
// Renders text invisible to sighted users but readable by
// screen readers. For icon-only buttons, decorative images, etc.
// Pattern: Radix UI VisuallyHidden, Reach UI.
// ═══════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  className?: string;
  /** Render as a different element (default: span) */
  as?: 'span' | 'div' | 'label' | 'p';
}

export function VisuallyHidden({ children, className, as: Tag = 'span' }: VisuallyHiddenProps) {
  return (
    <Tag
      className={cn(
        'absolute h-px w-px overflow-hidden border-0 p-0 whitespace-nowrap',
        '[clip:rect(0,0,0,0)]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
