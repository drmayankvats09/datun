// ═══════════════════════════════════════════════════════════════
// MESSAGE SKELETON — chat bubble placeholder (AI / user)
//
// MIRRORS
//   • Future consultation chat UI (Task #67).
//   • Future AI streaming response container (Task #68) — the same
//     skeleton renders briefly while the first token arrives.
//
// SHAPES
//   AI message (role="ai")
//   ┌── avatar ──┐  ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶
//                   ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶
//                   ╶╶╶╶╶╶╶╶╶╶╶╶
//
//   User message (role="user")
//                                         ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶
//
// HEIGHT BUDGET
//   • AI bubble    ≈ 80 px (avatar 32 + 3 text lines × 16)
//   • User bubble  ≈ 52 px (rounded pill 40 × 160)
//
// VARIANT
//   shimmer — chat is the single most-seen surface in Datun;
//   patients dwell here for minutes at a time. Worth the polish.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface MessageSkeletonProps {
  /**
   * Who the placeholder represents. Affects orientation, avatar
   * presence, and bubble shape — exact match for the real chat.
   */
  role?: 'ai' | 'user';

  /**
   * Optional Tailwind classes appended to the outer wrapper.
   */
  className?: string;
}

/**
 * A single chat-bubble placeholder. Compose multiple instances
 * (alternating roles) to form a full chat loading state.
 *
 * @example
 *   <MessageSkeleton role="ai" />
 *   <MessageSkeleton role="user" />
 *   <MessageSkeleton role="ai" />
 */
export function MessageSkeleton({ role = 'ai', className }: MessageSkeletonProps) {
  if (role === 'user') {
    return (
      <div
        className={cn('flex justify-end', className)}
        role="status"
        aria-busy="true"
        aria-label="Loading message"
      >
        <Skeleton variant="shimmer" className="h-10 w-40 max-w-[75%] rounded-2xl" />
      </div>
    );
  }

  // AI message — avatar tile + three text lines of decreasing width
  return (
    <div
      className={cn('flex gap-3', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading message"
    >
      <Skeleton variant="shimmer" className="h-8 w-8 shrink-0 rounded-full" />
      <div className="max-w-[75%] flex-1 space-y-2 pt-1">
        <Skeleton variant="shimmer" className="h-4 w-48" />
        <Skeleton variant="shimmer" className="h-4 w-64" />
        <Skeleton variant="shimmer" className="h-4 w-36" />
      </div>
    </div>
  );
}
