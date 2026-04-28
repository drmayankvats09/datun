// ═══════════════════════════════════════════════════════════════
// MOBILE NAV — Bottom tab bar (Instagram/Zomato/PhonePe pattern)
// P4-F10: i18n navigation (locale-aware links)
// P4-F15: Home "/" exact match
// P5-F11: Translation keys instead of hardcoded English
// ═══════════════════════════════════════════════════════════════

'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useKeyboardVisible } from '@/hooks';
import { Home, MessageCircle, ClipboardList, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', labelKey: 'home', icon: Home },
  { href: '/consult', labelKey: 'consult', icon: MessageCircle },
  { href: '/history', labelKey: 'history', icon: ClipboardList },
  { href: '/profile', labelKey: 'profile', icon: User },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const keyboardVisible = useKeyboardVisible();
  const t = useTranslations('common.nav');

  if (keyboardVisible) return null;

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl print:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-[4rem] flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
