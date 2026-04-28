// ═══════════════════════════════════════════════════════════════
// SECTION — Content section with heading + fluid spacing
// Consistent vertical rhythm across all pages.
// ═══════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** HTML id for anchor linking */
  id?: string;
}

export function Section({ children, className, title, description, id }: SectionProps) {
  return (
    <section id={id} className={cn('py-6 sm:py-8 lg:py-10', className)}>
      {(title || description) && (
        <div className="mb-5 sm:mb-6">
          {title && (
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
