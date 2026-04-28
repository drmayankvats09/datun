// ═══════════════════════════════════════════════════════════════
// CONSULTATION DEEP LINK — /consult/:id
// URL-driven state: bookmark, share, reload → same consultation.
// Pattern: ChatGPT /c/abc123, Notion /page/xyz
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useConsultationStore, useAuthStore } from '@/stores';
import { useHydration } from '@/hooks';
import { isLoggedIn } from '@/lib/auth';
import { Link } from '@/i18n/navigation';

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
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
      </main>
    );
  }

  if (!isLoggedIn()) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-primary">
          🦷
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Consultation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ID: <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{id}</code>
        </p>
        {user && (
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, <span className="font-medium text-primary">{user.name}</span>
          </p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Status: <span className="font-semibold text-primary">{status}</span>
        </p>
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Consultation UI will be built in upcoming tasks. This page confirms{' '}
            <strong className="text-primary">deep linking works</strong> — bookmark this URL, share
            it, reload it — you always land here.
          </p>
        </div>
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
