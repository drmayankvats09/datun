// ═══════════════════════════════════════════════════════════════
// DESKTOP SIDEBAR — Left navigation for desktop/tablet
// Collapsible, remembers state (Zustand UI store).
// Pattern: Notion, Linear, Stripe Dashboard.
// ═══════════════════════════════════════════════════════════════

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores';
import { BRAND } from '@repo/shared';
import {
  Home,
  MessageCircle,
  ClipboardList,
  User,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SIDEBAR_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/consult', label: 'New Consultation', icon: MessageCircle },
  { href: '/history', label: 'History', icon: ClipboardList },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function DesktopSidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'border-border/60 bg-background sticky top-0 hidden h-screen shrink-0 border-r transition-all duration-200 lg:flex lg:flex-col',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="border-border/40 flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white">
            D
          </span>
          {!collapsed && (
            <span className="text-foreground text-lg font-bold tracking-tight">{BRAND.name}</span>
          )}
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-border/40 border-t p-2">
        <button
          onClick={toggleSidebar}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
