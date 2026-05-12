// ═══════════════════════════════════════════════════════════════
// ADMIN LAYOUT — Task #44 Phase 3
//
// Route guard for /admin/* — requires authenticated user with
// role IN ('ADMIN', 'OWNER'). Patients / clinic staff bounced.
//
// Auth flow:
//   1. Wait for Zustand hydration (prevent SSR flash)
//   2. If not logged in → redirect to /login?returnTo=...
//   3. If logged in but wrong role → redirect to / + toast
//   4. If admin/owner → render children
//
// Pattern: Stripe Dashboard admin gate, Vercel team-admin check.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores';
import { useHydration } from '@/hooks';
import { isLoggedIn } from '@/lib/auth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const ADMIN_ROLES = ['ADMIN', 'OWNER'] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

function isAdminRole(role: string | undefined): role is AdminRole {
  return role !== undefined && (ADMIN_ROLES as readonly string[]).includes(role);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydration();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const t = useTranslations('admin.labeling.errors');

  useEffect(() => {
    if (!hydrated) return;

    if (!isLoggedIn() || !user) {
      const returnTo = typeof window !== 'undefined' ? window.location.pathname : '/admin/label';
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    if (!isAdminRole(user.role)) {
      toast.error(t('forbidden'));
      router.replace('/');
    }
  }, [hydrated, user, router, t]);

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </main>
    );
  }

  if (!isLoggedIn() || !user || !isAdminRole(user.role)) {
    // Render nothing while redirect is in flight
    return null;
  }

  return <>{children}</>;
}
