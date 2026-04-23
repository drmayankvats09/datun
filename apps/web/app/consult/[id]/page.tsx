// ═══════════════════════════════════════════════════════════════
// CONSULTATION DEEP LINK — /consult/:id
// URL-driven state: bookmark, share, reload → same consultation.
// Pattern: ChatGPT /c/abc123, Notion /page/xyz
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useConsultationStore, useAuthStore } from '@/stores';
import { useHydration } from '@/hooks';
import { isLoggedIn } from '@/lib/auth';
import Link from 'next/link';

export default function ConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydration();
  const user = useAuthStore((s) => s.user);
  const { activeConsultationId, resumeConsultation, status } = useConsultationStore();

  useEffect(() => {
    if (!hydrated) return;

    if (!isLoggedIn()) {
      router.replace(`/login?returnTo=/consult/${id}`);
      return;
    }

    if (id && id !== activeConsultationId) {
      // Future: API call to fetch consultation by ID from server
      resumeConsultation(id, [], 'in_progress');
    }
  }, [hydrated, id, activeConsultationId, resumeConsultation, router]);

  if (!hydrated) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
      </main>
    );
  }

  if (!isLoggedIn()) return null;

  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl">
          🦷
        </div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Consultation</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          ID: <code className="bg-muted rounded px-2 py-0.5 font-mono text-xs">{id}</code>
        </p>
        {user && (
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome back, <span className="text-primary font-medium">{user.name}</span>
          </p>
        )}
        <p className="text-muted-foreground mt-4 text-sm">
          Status: <span className="text-primary font-semibold">{status}</span>
        </p>
        <div className="border-border bg-card mt-8 rounded-xl border p-6">
          <p className="text-muted-foreground text-sm">
            Consultation UI will be built in upcoming tasks. This page confirms{' '}
            <strong className="text-primary">deep linking works</strong> — bookmark this URL, share
            it, reload it — you always land here.
          </p>
        </div>
        <Link
          href="/"
          className="text-muted-foreground hover:text-primary mt-8 inline-block text-sm transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
