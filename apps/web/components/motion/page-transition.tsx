// ═══════════════════════════════════════════════════════════════
// PAGE TRANSITION — Subtle fade for route changes
// Wraps page content. Animates on mount.
// Pattern: Notion, Linear — pages don't just appear, they fade in.
// ═══════════════════════════════════════════════════════════════

'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
