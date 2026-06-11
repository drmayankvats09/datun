// ═══════════════════════════════════════════════════════════════
// STATUS FOOTER — Languages badge + Instagram/LinkedIn + copyright
// ═══════════════════════════════════════════════════════════════

'use client';

import { m, useReducedMotion } from 'framer-motion';
import { Globe } from 'lucide-react';

interface StatusFooterProps {
  languagesLabel: string;
  copyrightLabel: string;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="rounded-full p-2 text-muted-foreground/70 transition-all duration-200 hover:scale-110 hover:bg-primary/8 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    >
      {children}
    </a>
  );
}

export function StatusFooter({ languagesLabel, copyrightLabel }: StatusFooterProps) {
  const reduceMotion = useReducedMotion();

  return (
    <m.footer
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, delay: 1.6, ease: EASE_OUT_EXPO }}
      className="relative z-10 flex flex-col items-center gap-4 px-4 pt-4 pb-6 sm:gap-5 sm:px-6 sm:pb-8"
    >
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Globe className="h-4 w-4" aria-hidden="true" />
        {languagesLabel}
      </span>

      <div className="flex items-center gap-1.5">
        <SocialLink href="https://instagram.com/datun.ai" label="Datun on Instagram">
          <InstagramIcon className="h-[18px] w-[18px]" />
        </SocialLink>
        <SocialLink href="https://linkedin.com/company/datunai" label="Datun on LinkedIn">
          <LinkedinIcon className="h-[18px] w-[18px]" />
        </SocialLink>
      </div>

      <p className="text-xs text-muted-foreground">{copyrightLabel}</p>
    </m.footer>
  );
}
