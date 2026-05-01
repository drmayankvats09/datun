// ═══════════════════════════════════════════════════════════════
// PRIMARY ACTIONS — Symmetric CTA pair
//   - WhatsApp filled primary
//   - Notify outlined ghost
// Equal width, side-by-side desktop, stacked mobile.
// ═══════════════════════════════════════════════════════════════

'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface PrimaryActionsProps {
  ctaWhatsAppLabel: string;
  ctaNotifyLabel: string;
  whatsappPhone: string;
  notifyEmail: string;
  notifySubject: string;
  notifyBody: string;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2.5" />
      <path d="m2 7 9.06 5.7a1.94 1.94 0 0 0 2.06 0L22 7" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function PrimaryActions({
  ctaWhatsAppLabel,
  ctaNotifyLabel,
  whatsappPhone,
  notifyEmail,
  notifySubject,
  notifyBody,
}: PrimaryActionsProps) {
  const reduceMotion = useReducedMotion();

  const whatsappUrl =
    'https://wa.me/' +
    whatsappPhone +
    '?text=' +
    encodeURIComponent('Hi Datun! I want to know more about the platform.');

  const mailtoUrl =
    'mailto:' +
    notifyEmail +
    '?subject=' +
    encodeURIComponent(notifySubject) +
    '&body=' +
    encodeURIComponent(notifyBody);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, delay: 1.25, ease: EASE_OUT_EXPO }}
      className="mt-9 flex w-full max-w-md flex-col items-stretch gap-3 sm:mt-11 sm:max-w-lg sm:flex-row sm:gap-4"
    >
      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={reduceMotion ? undefined : { y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
        className="group inline-flex flex-1 items-center justify-center gap-2.5 rounded-full bg-primary px-6 py-3.5 text-base font-semibold whitespace-nowrap text-primary-foreground shadow-[0_8px_30px_-8px_rgba(0,168,150,0.6)] transition-shadow duration-300 hover:shadow-[0_12px_40px_-6px_rgba(0,168,150,0.7)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background focus-visible:outline-none sm:py-4"
        aria-label={ctaWhatsAppLabel}
      >
        <WhatsAppIcon className="h-5 w-5" />
        <span>{ctaWhatsAppLabel}</span>
        <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </motion.a>

      <motion.a
        href={mailtoUrl}
        whileHover={reduceMotion ? undefined : { y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
        className="group inline-flex flex-1 items-center justify-center gap-2.5 rounded-full border-2 border-border bg-card/60 px-6 py-3.5 text-base font-semibold whitespace-nowrap text-foreground backdrop-blur-sm transition-colors duration-200 hover:border-primary/50 hover:bg-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background focus-visible:outline-none sm:py-4"
        aria-label={ctaNotifyLabel}
      >
        <MailIcon className="h-5 w-5" />
        <span>{ctaNotifyLabel}</span>
      </motion.a>
    </motion.div>
  );
}
