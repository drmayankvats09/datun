'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Diagnosis / Assessment card (Part 15.12, Family B4). COMPOSED: the signature
 * health gauge (Part 19.8) + Card + Button + Badge. "Doctor-backed diagnosis" framing
 * (NEVER "guidance"/"AI" — Part 12.6). Severity = 3-level Routine/Needs attention/
 * Urgent, gauge with label+icon+colour (never colour-alone). Single primary next-step.
 * Trust marker: "Reviewed by Dr.___ (Reg. No. ___)" (NMC disclosure). Urgent variant
 * surfaces the Emergency escalation supportively.
 */
export type Severity = 'routine' | 'attention' | 'urgent';

export interface DiagnosisCardProps {
  diagnosis: string;
  /** One-line "what this is". */
  summary: string;
  severity: Severity;
  whatItMeans: React.ReactNode;
  why: React.ReactNode;
  /** Single primary next step (label + handler). */
  nextStep: { label: string; onClick?: () => void };
  reviewer: { name: string; regNo: string };
  /** The signature gauge node (HealthGauge) — injected so we compose, not rebuild. */
  gauge: React.ReactNode;
  /** Shown above the card when severity === 'urgent' (the Emergency Alert). */
  escalation?: React.ReactNode;
  className?: string;
}

export function DiagnosisCard({
  diagnosis,
  summary,
  severity,
  whatItMeans,
  why,
  nextStep,
  reviewer,
  gauge,
  escalation,
  className,
}: DiagnosisCardProps) {
  return (
    <div className={cn('dtn-dxwrap', className)}>
      {severity === 'urgent' && escalation}
      <article className={cn('dtn-dx', `dtn-dx--${severity}`)} aria-label="Your assessment">
        <header className="dtn-dx__head">
          <span className="dtn-dx__kicker">Doctor-backed diagnosis</span>
          <h2 className="dtn-dx__title">{diagnosis}</h2>
          <p className="dtn-dx__summary">{summary}</p>
        </header>

        <div className="dtn-dx__gauge">{gauge}</div>

        <dl className="dtn-dx__detail">
          <dt>What this means</dt>
          <dd>{whatItMeans}</dd>
          <dt>Why</dt>
          <dd>{why}</dd>
        </dl>

        <div className="dtn-dx__next">
          <button type="button" className="dtn-dx__cta" onClick={nextStep.onClick}>
            {nextStep.label}
          </button>
          <div className="dtn-dx__actions">
            <button type="button" className="dtn-dx__act" aria-label="Save">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                  d="M6 3h12v18l-6-4-6 4Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
              </svg>{' '}
              Save
            </button>
            <button type="button" className="dtn-dx__act" aria-label="Share">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                  d="M16 6l-4-3-4 3M12 3v13"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
              </svg>{' '}
              Share
            </button>
            <button type="button" className="dtn-dx__act" aria-label="Download report">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                  d="M12 4v11M8 11l4 4 4-4M5 20h14"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>{' '}
              Report (PDF)
            </button>
          </div>
        </div>

        <footer className="dtn-dx__trust">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
            <path
              d="M12 2.6c2.4 1.7 4.7 2.2 7 2.2v6.9c0 4.6-3.1 7.3-7 9-3.9-1.7-7-4.4-7-9V4.8c2.3 0 4.6-.5 7-2.2Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M8.6 12.2 11 14.6l4.4-4.8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            Reviewed by <strong>{reviewer.name}</strong> · Reg. No. {reviewer.regNo}
          </span>
        </footer>
        <p className="dtn-dx__disclaimer">
          This assessment supports, and doesn’t replace, an in-person dental exam where indicated.
        </p>
      </article>
    </div>
  );
}
