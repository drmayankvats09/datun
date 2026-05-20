import { cn } from '@/lib/utils';
import { Shimmer } from '@/components/motion';

// ═══════════════════════════════════════════════════════════════
// SKELETON — Loading placeholder (shadcn/ui base) + Task #50 shimmer
//
// Two variants:
//   - 'pulse'   (default) — opacity-fade pulse via Tailwind
//                            `animate-pulse`. Cheap, OK feel. Stable
//                            since Task #21; default for backward
//                            compatibility.
//   - 'shimmer'           — premium left-to-right gradient sweep via
//                            <Shimmer> (Task #50). Same ARIA shape;
//                            theme-aware via CSS variables; better
//                            perceived quality (Instagram / Facebook
//                            pattern).
//
// Pick by feel:
//   - High-traffic core surfaces (consultation page, dashboard) →
//     'shimmer'. Worth the extra polish.
//   - Long lists / dense grids → 'pulse'. Cheaper at scale; users
//     don't stare long enough to notice the difference.
// ═══════════════════════════════════════════════════════════════

type SkeletonVariant = 'pulse' | 'shimmer';

interface SkeletonProps extends React.ComponentProps<'div'> {
  /** Loading-state visual treatment (default 'pulse'). */
  variant?: SkeletonVariant;
}

function Skeleton({ className, variant = 'pulse', ...props }: SkeletonProps) {
  if (variant === 'shimmer') {
    // Forward className so consumers can size the shimmer block
    // exactly like a pulse Skeleton (h-8, w-32, rounded-md, etc).
    return <Shimmer className={className} {...props} />;
  }

  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
export type { SkeletonProps, SkeletonVariant };
