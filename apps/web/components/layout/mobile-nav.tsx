// ═══════════════════════════════════════════════════════════════
// MOBILE NAV — Bottom tab bar (Instagram/Zomato/PhonePe pattern)
// Thumb-reachable, 5 max items, active state highlighted.
// Hides when keyboard is open (useKeyboardVisible).
// ═══════════════════════════════════════════════════════════════

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useKeyboardVisible } from '@/hooks';
import { Home, MessageCircle, ClipboardList, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/consult', label: 'Consult', icon: MessageCircle },
  { href: '/history', label: 'History', icon: ClipboardList },
  { href: '/profile', label: 'Profile', icon: User },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const keyboardVisible = useKeyboardVisible();

  // Hide when keyboard is open (form input focused)
  if (keyboardVisible) return null;

  return (
    <nav
      className="border-border/60 bg-background/95 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur-xl print:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
