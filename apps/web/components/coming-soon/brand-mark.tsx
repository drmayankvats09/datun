// ═══════════════════════════════════════════════════════════════
// BRAND MARK — Premium tooth SVG with halo + wordmark
//
// Anatomically accurate tooth with:
//   - White-cream gradient body
//   - Teal stroke + teal shadow gradient (depth)
//   - Highlight reflection top-left (premium 3D)
//   - Drop shadow + halo (floating premium feel)
//   - Subtle breathing animation (3s, 1.04 scale)
// ═══════════════════════════════════════════════════════════════

'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface BrandMarkProps {
  brandName: string;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function ToothLogo({ size = 100 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ filter: 'drop-shadow(0 8px 24px rgba(0,168,150,0.35))' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="toothGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8f5f2" />
        </linearGradient>
        <linearGradient id="toothShadow" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#00a896" stopOpacity="0" />
          <stop offset="100%" stopColor="#00a896" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <path
        d="M50 12 C36 12, 25 19, 22 32 C20 42, 23 53, 27 65 C29 71, 31 78, 33 84 C34 87, 36 89, 39 89 C42 89, 43 86, 44 82 C46 76, 47 70, 49 67 C50 65.5, 51 65.5, 51 67 C53 70, 54 76, 56 82 C57 86, 58 89, 61 89 C64 89, 66 87, 67 84 C69 78, 71 71, 73 65 C77 53, 80 42, 78 32 C75 19, 64 12, 50 12 Z"
        fill="url(#toothGrad)"
        stroke="#00a896"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M50 12 C36 12, 25 19, 22 32 C20 42, 23 53, 27 65 C29 71, 31 78, 33 84 C34 87, 36 89, 39 89 C42 89, 43 86, 44 82 C46 76, 47 70, 49 67 C50 65.5, 51 65.5, 51 67 C53 70, 54 76, 56 82 C57 86, 58 89, 61 89 C64 89, 66 87, 67 84 C69 78, 71 71, 73 65 C77 53, 80 42, 78 32 C75 19, 64 12, 50 12 Z"
        fill="url(#toothShadow)"
        opacity="0.6"
      />
      <ellipse cx="42" cy="28" rx="6" ry="9" fill="#ffffff" opacity="0.85" />
    </svg>
  );
}

export function BrandMark({ brandName }: BrandMarkProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-7">
      <div className="relative flex h-[100px] w-[100px] items-center justify-center sm:h-[110px] sm:w-[110px]">
        {!reduceMotion && (
          <motion.div
            className="absolute -inset-4 rounded-full"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.5, 0.85, 0.5],
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              background:
                'radial-gradient(circle at center, rgba(0, 168, 150, 0.28) 0%, transparent 60%)',
              filter: 'blur(20px)',
            }}
            aria-hidden="true"
          />
        )}

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
          animate={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: [1, 1.04, 1] }}
          transition={
            reduceMotion
              ? { duration: 0.9, ease: EASE_OUT_EXPO }
              : {
                  opacity: { duration: 0.9, delay: 0.2, ease: EASE_OUT_EXPO },
                  scale: {
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1,
                  },
                }
          }
          className="relative z-10"
        >
          <ToothLogo size={100} />
        </motion.div>
      </div>

      <motion.h1
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: EASE_OUT_EXPO }}
        className="text-5xl font-bold text-foreground sm:text-6xl lg:text-7xl"
        style={{ letterSpacing: '-0.04em', lineHeight: 1 }}
      >
        {brandName}
      </motion.h1>
    </div>
  );
}
