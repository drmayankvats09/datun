// ═══════════════════════════════════════════════════════════════
// DESKTOP SIDEBAR — Left navigation for desktop/tablet
// Collapsible, remembers state (Zustand UI store).
// P4-F10: i18n navigation (locale-aware links)
// P4-F15: Home "/" exact match (was always active)
// P5-F11: Translation keys instead of hardcoded English
// ═══════════════════════════════════════════════════════════════

'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
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
  { href: '/', labelKey: 'home', icon: Home },
  { href: '/consult', labelKey: 'newConsultation', icon: MessageCircle },
  { href: '/history', labelKey: 'history', icon: ClipboardList },
  { href: '/profile', labelKey: 'profile', icon: User },
  { href: '/settings', labelKey: 'settings', icon: Settings },
] as const;

export function DesktopSidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const t = useTranslations('common.nav');

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 border-r border-border/60 bg-background transition-all duration-200 lg:flex lg:flex-col',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border/40 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
            D
          </span>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-foreground">{BRAND.name}</span>
          )}
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const label = t(item.labelKey);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border/40 p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span>{t('collapse') ?? 'Collapse'}</span>}
        </button>
      </div>
    </aside>
  );
}
