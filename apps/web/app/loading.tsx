// ═══════════════════════════════════════════════════════════════
// LOADING — Root Suspense boundary (skeleton while page loads)
// ═══════════════════════════════════════════════════════════════

import { PageSkeleton } from '@/components/feedback';

export default function Loading() {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center">
      <PageSkeleton />
    </main>
  );
}
