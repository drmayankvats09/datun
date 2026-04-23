// ═══════════════════════════════════════════════════════════════
// FORM LAYOUT — Centered form wrapper
// Login, signup, intake, booking, clinic registration — all forms.
// Mobile: full width. Desktop: centered 480px max.
// ═══════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

interface FormLayoutProps {
  children: React.ReactNode;
  className?: string;
  /** Max width of form */
  maxWidth?: 'sm' | 'md' | 'lg';
  /** Title above form */
  title?: string;
  /** Description below title */
  description?: string;
}

const widthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function FormLayout({
  children,
  className,
  maxWidth = 'md',
  title,
  description,
}: FormLayoutProps) {
  return (
    <div className={cn('mx-auto w-full px-4 sm:px-0', widthMap[maxWidth], className)}>
      {(title || description) && (
        <div className="mb-6 text-center sm:mb-8">
          {title && (
            <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
          )}
          {description && <p className="text-muted-foreground mt-2 text-sm">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
