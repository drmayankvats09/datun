// ═══════════════════════════════════════════════════════════════
// APP SHELL — Smart navigation switcher
// Mobile: content + bottom nav. Desktop: sidebar + content.
// Wrap authenticated pages in this. Labs, pharmacy, clinics — same shell.
// Pattern: Every FAANG SaaS app (Notion, Linear, Slack).
// ═══════════════════════════════════════════════════════════════

'use client';

import { useBreakpoint } from '@/hooks';
import { MobileNav } from './mobile-nav';
import { DesktopSidebar } from './desktop-sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isMobile } = useBreakpoint();
  // P4-F14: Only phones + portrait tablets get bottom nav
  const showMobileNav = isMobile;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop: sidebar */}
        {!showMobileNav && <DesktopSidebar />}

        {/* Main content */}
        <main className={showMobileNav ? 'w-full pb-16' : 'flex-1'}>{children}</main>
      </div>

      {/* Mobile: bottom nav */}
      {showMobileNav && <MobileNav />}
    </div>
  );
}
