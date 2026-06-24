'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Consult — guided assessment conversation (Part 15.12, Family B1–B3).
 * COMPOSED, not rebuilt: bubbles + quick-reply Chips + free-text + photo-upload
 * (DPDP consent, skippable) + voice + "Step X of Y" progress + back-edit (no
 * restart) + the calm "Reviewing your answers with our dental team…" skeleton
 * (NOT a spinner, NEVER "AI" — Part 12.4) + the escalation hook (red-flag →
 * Emergency banner). One question at a time. Honest scope. Mobile-first.
 */
export interface ConsultBubble {
  id: string;
  role: 'system' | 'user';
  text: React.ReactNode;
}
export interface ConsultProps {
  bubbles: ConsultBubble[];
  /** Quick-reply options for the current question (15.10 chips). */
  quickReplies?: string[];
  onQuickReply?: (value: string) => void;
  onFreeText?: (value: string) => void;
  onPhoto?: () => void;
  onVoice?: () => void;
  step?: { current: number; total: number };
  /** Shows the in-shape "Reviewing…" skeleton instead of the input. */
  reviewing?: boolean;
  /** Red-flag escalation node (the imported Emergency Alert) — short-circuits the flow. */
  escalation?: React.ReactNode;
  className?: string;
}

export function Consult({
  bubbles,
  quickReplies,
  onQuickReply,
  onFreeText,
  onPhoto,
  onVoice,
  step,
  reviewing,
  escalation,
  className,
}: ConsultProps) {
  const [draft, setDraft] = React.useState('');
  return (
    <section className={cn('dtn-consult', className)} aria-label="Dental assessment conversation">
      {step && (
        <div className="dtn-consult__progress">
          <span className="dtn-consult__step">
            Step {step.current} of {step.total}
          </span>
          <div
            className="dtn-consult__bar"
            role="progressbar"
            aria-label="Assessment progress"
            aria-valuenow={step.current}
            aria-valuemin={1}
            aria-valuemax={step.total}
          >
            <div
              className="dtn-consult__fill"
              style={{ transform: `scaleX(${step.current / step.total})` }}
            />
          </div>
        </div>
      )}

      <div className="dtn-consult__log" role="log" aria-live="polite">
        {bubbles.map((b) => (
          <div key={b.id} className={cn('dtn-bubble', `dtn-bubble--${b.role}`)}>
            {b.text}
          </div>
        ))}
      </div>

      {escalation /* red-flag → Emergency banner, short-circuits */}

      {!escalation && reviewing && (
        <div className="dtn-consult__reviewing" role="status" aria-live="polite">
          <span className="dtn-sr-only">Reviewing your answers with our dental team…</span>
          <div
            className="dtn-skeleton dtn-skeleton--line"
            style={{ width: '55%', height: '0.9em' }}
          />
          <div className="dtn-skeleton dtn-skeleton--block" style={{ height: 64 }} />
          <div
            className="dtn-skeleton dtn-skeleton--line"
            style={{ width: '85%', height: '0.8em' }}
          />
          <p className="dtn-consult__reviewing-note">
            Reviewing your answers with our dental team…
          </p>
        </div>
      )}

      {!escalation && !reviewing && (
        <div className="dtn-consult__input">
          {quickReplies && quickReplies.length > 0 && (
            <div className="dtn-consult__chips" role="group" aria-label="Quick replies">
              {quickReplies.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="dtn-chip dtn-chip--interactive"
                  onClick={() => onQuickReply?.(q)}
                >
                  {q}
                </button>
              ))}
              <button
                type="button"
                className="dtn-chip dtn-chip--interactive dtn-chip--ghost"
                onClick={() => onQuickReply?.('Not sure')}
              >
                Not sure / skip
              </button>
            </div>
          )}
          <div className="dtn-consult__row">
            <button
              type="button"
              className="dtn-consult__icon"
              aria-label="Add a photo of the area"
              onClick={onPhoto}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <path
                  d="M4 8h3l1.5-2h7L17 8h3v11H4Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.75" />
              </svg>
            </button>
            <input
              className="dtn-consult__field"
              placeholder="Type your answer…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && draft.trim()) {
                  onFreeText?.(draft);
                  setDraft('');
                }
              }}
            />
            <button
              type="button"
              className="dtn-consult__icon"
              aria-label="Answer by voice"
              onClick={onVoice}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <rect
                  x="9"
                  y="3"
                  width="6"
                  height="11"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <path
                  d="M5 11a7 7 0 0 0 14 0M12 18v3"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <p className="dtn-consult__scope">
            A doctor-backed assessment. A remote check can’t fully replace an in-person exam.
          </p>
        </div>
      )}
    </section>
  );
}
