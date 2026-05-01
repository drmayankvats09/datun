// ═══════════════════════════════════════════════════════════════
// AURORA BACKGROUND — Calm flowing gradient atmosphere
// Pure CSS (no color-mix), GPU-accelerated, cross-browser stable.
// Pattern: Cal.com / Linear hero atmospheres.
// ═══════════════════════════════════════════════════════════════

export function AuroraBg() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
      >
        <div
          className="motion-safe:animate-aurora-slow absolute -inset-[20%]"
          style={{
            background: `
              radial-gradient(at 22% 30%, rgba(0, 168, 150, 0.32) 0px, transparent 55%),
              radial-gradient(at 78% 22%, rgba(30, 197, 179, 0.20) 0px, transparent 50%),
              radial-gradient(at 50% 78%, rgba(0, 168, 150, 0.26) 0px, transparent 60%),
              radial-gradient(at 88% 88%, rgba(0, 168, 150, 0.18) 0px, transparent 45%)
            `,
            backgroundSize: '200% 200%',
            filter: 'blur(8px)',
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 35%, var(--background) 95%)',
          }}
        />
      </div>

      <style>{`
        @keyframes aurora-slow {
          0%   { background-position: 0% 50%, 100% 0%, 50% 100%, 100% 100%; }
          50%  { background-position: 100% 50%, 0% 50%, 50% 0%, 0% 0%; }
          100% { background-position: 0% 50%, 100% 0%, 50% 100%, 100% 100%; }
        }
        .motion-safe\\:animate-aurora-slow {
          animation: aurora-slow 22s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-safe\\:animate-aurora-slow { animation: none !important; }
        }
      `}</style>
    </>
  );
}
