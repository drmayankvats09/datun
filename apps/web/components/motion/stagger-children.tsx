// ═══════════════════════════════════════════════════════════════
// STAGGER CHILDREN — List items animate one by one
// Cards, list items, search results — appear sequentially.
// Pattern: Notion database entries, Linear issue list.
// ═══════════════════════════════════════════════════════════════

'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks';

interface StaggerChildrenProps {
  children: React.ReactNode;
  className?: string;
  /** Delay between each child in seconds */
  stagger?: number;
}

const containerVariants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: { staggerChildren: stagger },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  },
};

export function StaggerContainer({ children, className, stagger = 0.05 }: StaggerChildrenProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={stagger}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
