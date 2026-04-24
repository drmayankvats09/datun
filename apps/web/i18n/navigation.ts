// ═══════════════════════════════════════════════════════════════
// I18N NAVIGATION — Locale-aware Link, redirect, useRouter
// Use these instead of next/link and next/navigation.
// They auto-prefix locale in URLs.
// ═══════════════════════════════════════════════════════════════

import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
