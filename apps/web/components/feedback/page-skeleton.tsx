// ═══════════════════════════════════════════════════════════════
// PAGE SKELETON — Shimmer loading states for different page types
// FAANG pattern: NEVER show blank screen. Always show structure.
// Instagram, YouTube, WhatsApp — sab skeleton dikhate hain.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';

/** Generic page skeleton — header + content blocks */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-2 h-4 w-20" />
      <Skeleton className="mb-8 h-8 w-64" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Card grid skeleton — for clinic listings, lab results, pharmacy */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-border rounded-xl border p-4">
          <Skeleton className="mb-3 h-5 w-3/4" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-4 h-4 w-2/3" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Chat skeleton — for consultation page */
export function ChatSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
      {/* AI message */}
      <div className="flex gap-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="max-w-[75%] space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      {/* User message */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-40 rounded-2xl" />
      </div>
      {/* AI message */}
      <div className="flex gap-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="max-w-[75%] space-y-2">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-44" />
        </div>
      </div>
      {/* Input bar */}
      <div className="fixed right-0 bottom-0 left-0 border-t p-4">
        <Skeleton className="mx-auto h-12 max-w-2xl rounded-xl" />
      </div>
    </div>
  );
}

/** Form skeleton — for auth pages, intake forms */
export function FormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4">
      <Skeleton className="mb-6 h-8 w-48" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="mt-2 h-11 w-full rounded-lg" />
    </div>
  );
}
