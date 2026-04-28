// ═══════════════════════════════════════════════════════════════
// LOADING — Root Suspense boundary (skeleton while page loads)
// ═══════════════════════════════════════════════════════════════

import { PageSkeleton } from '@/components/feedback';

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <PageSkeleton />
    </main>
  );
}
