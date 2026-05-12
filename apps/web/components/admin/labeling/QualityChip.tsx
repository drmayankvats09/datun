// ═══════════════════════════════════════════════════════════════
// QUALITY CHIP — 1-5 score buttons with keyboard shortcuts
// Task #44 Phase 3
//
// Design rationale:
//   - 5 buttons in a row, color-graded red → green
//   - Visual indicator when judge score is present (annotation badge)
//   - Diff indicator (red ring) when score differs from judge by ≥ 2
//   - Keyboard accessible: keys 1-5 select, Enter submits
//   - All buttons have aria-label for screen readers
//
// Pattern: Linear's status picker, Stripe's risk-score selector.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const SCORES = [1, 2, 3, 4, 5] as const;
type Score = (typeof SCORES)[number];

const SCORE_COLORS: Record<Score, string> = {
  1: 'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500/40',
  2: 'bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500/40',
  3: 'bg-amber-400 text-amber-950 hover:bg-amber-500 focus-visible:ring-amber-500/40',
  4: 'bg-lime-500 text-white hover:bg-lime-600 focus-visible:ring-lime-500/40',
  5: 'bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-500/40',
};

const SCORE_RING_UNSELECTED =
  'bg-card text-foreground ring-1 ring-border hover:ring-2 hover:ring-primary/30';

interface QualityChipProps {
  /** Currently selected score (1-5) or null if unset. */
  value: Score | null;
  /** Callback when user selects a score. */
  onChange: (score: Score) => void;
  /** Optional judge's score for diff highlighting. */
  judgeScore?: number | null;
  /** Disable interaction (e.g., during submit). */
  disabled?: boolean;
  /** Enable global keyboard shortcuts (1-5). */
  enableKeyboard?: boolean;
}

export function QualityChip({
  value,
  onChange,
  judgeScore = null,
  disabled = false,
  enableKeyboard = true,
}: QualityChipProps) {
  const t = useTranslations('admin.labeling.quality');

  // ── Keyboard shortcuts ──
  useEffect(() => {
    if (!enableKeyboard || disabled) return;
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in form fields
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      const key = e.key;
      if (['1', '2', '3', '4', '5'].includes(key)) {
        const score = Number(key) as Score;
        e.preventDefault();
        onChange(score);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enableKeyboard, disabled, onChange]);

  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Quality score">
      {SCORES.map((score) => {
        const selected = value === score;
        const isJudgeChoice =
          judgeScore !== null && judgeScore !== undefined && Math.round(judgeScore) === score;
        const conflictWithJudge =
          judgeScore !== null &&
          judgeScore !== undefined &&
          selected &&
          Math.abs(score - judgeScore) >= 2;

        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${score} — ${t(String(score) as '1' | '2' | '3' | '4' | '5')}`}
            disabled={disabled}
            onClick={() => onChange(score)}
            className={cn(
              'relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-base font-semibold transition-all select-none',
              'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected ? SCORE_COLORS[score] : SCORE_RING_UNSELECTED,
              conflictWithJudge && 'ring-2 ring-red-500 ring-offset-2',
            )}
            title={t('shortcut', {
              key: String(score),
              label: t(String(score) as '1' | '2' | '3' | '4' | '5'),
            })}
          >
            {score}
            {isJudgeChoice && (
              <span
                className="absolute -top-1 -right-1 inline-flex size-3 items-center justify-center rounded-full bg-blue-500 ring-2 ring-card"
                aria-label="Judge agreed"
                title={`Judge score: ${judgeScore}`}
              />
            )}
          </button>
        );
      })}

      {/* Inline label of selected score */}
      <div className="ml-3 min-w-[120px] text-sm text-muted-foreground">
        {value !== null ? (
          <span className="font-medium text-foreground">
            {t(String(value) as '1' | '2' | '3' | '4' | '5')}
          </span>
        ) : (
          <span className="text-muted-foreground/70">Press 1-5</span>
        )}
      </div>
    </div>
  );
}
