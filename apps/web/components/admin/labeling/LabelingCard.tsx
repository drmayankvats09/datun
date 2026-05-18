// ═══════════════════════════════════════════════════════════════
// LABELING CARD — Per-message review card
// Task #44 Phase 3
//
// Composes:
//   - MessageThread (read-only conversation)
//   - QualityChip (1-5 buttons with keyboard)
//   - CorrectionEditor (markdown textarea with auto-save)
//   - isCorrect Switch
//   - category Input (tag)
//   - Judge score + reasoning panel (collapsible)
//
// Submit flow:
//   1. Validate: score ≥ 3 OR correctionText non-empty
//   2. Call onSubmit prop (parent hook handles API)
//   3. Clear local state on success
//
// PHASE 3 (Task #47) UPDATE — IMPORT MIGRATION ONLY:
//   `SubmitLabelInput` now imports from `@/hooks/mutations` (the new
//   TanStack Query mutation surface) instead of the legacy
//   `@/lib/training-api`. The TYPE SHAPE IS IDENTICAL — this is a
//   zero-risk path swap so we can retire the legacy hand-rolled client.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { LabelingQueueItem } from '@repo/shared';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/feedback';
import { ChevronDown, ChevronUp, Scale as ScaleIcon, SkipForward } from 'lucide-react';
import { QualityChip } from './QualityChip';
import { CorrectionEditor } from './CorrectionEditor';
import { MessageThread } from './MessageThread';
import type { SubmitLabelInput } from '@/hooks/mutations';

interface LabelingCardProps {
  item: LabelingQueueItem;
  onSubmit: (input: SubmitLabelInput) => Promise<boolean>;
  onSkip?: () => void;
  /** Enable keyboard shortcuts (1-5, Cmd+Enter). Only one card per page should enable. */
  isFocused?: boolean;
}

const SCORE_REQUIRES_CORRECTION = 2; // score ≤ 2 → correction text mandatory

export function LabelingCard({ item, onSubmit, onSkip, isFocused = false }: LabelingCardProps) {
  const t = useTranslations('admin.labeling.card');

  const [score, setScore] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [isCorrect, setIsCorrect] = useState(true);
  const [correction, setCorrection] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [category, setCategory] = useState('');
  const [judgePanelOpen, setJudgePanelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const correctionRequired = score !== null && score <= SCORE_REQUIRES_CORRECTION;
  const canSubmit = score !== null && (!correctionRequired || correction.trim().length > 0);

  async function handleSubmit() {
    if (!canSubmit || score === null) return;
    setSubmitting(true);
    const ok = await onSubmit({
      messageId: item.messageId,
      qualityScore: score,
      isCorrect,
      correctionText: correction.trim().length > 0 ? correction.trim() : null,
      clinicalNotes: clinicalNotes.trim().length > 0 ? clinicalNotes.trim() : null,
      category: category.trim().length > 0 ? category.trim() : null,
    });
    setSubmitting(false);
    if (ok) {
      // Local state cleared by parent unmounting via queue mutation;
      // but if the card stays mounted, reset:
      setScore(null);
      setIsCorrect(true);
      setCorrection('');
      setClinicalNotes('');
      setCategory('');
    }
  }

  return (
    <Card className="overflow-visible">
      {/* Header — judge score badge */}
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>#{item.sequenceNumber}</span>
            <span aria-hidden>•</span>
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            {item.uncertaintyBand && (
              <span
                className={
                  item.uncertaintyBand === 'HIGH'
                    ? 'rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-400'
                    : item.uncertaintyBand === 'MEDIUM'
                      ? 'rounded-full bg-blue-500/15 px-2 py-0.5 text-blue-700 dark:text-blue-400'
                      : 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-400'
                }
              >
                {item.uncertaintyBand}
              </span>
            )}
            {item.existingLabelId && (
              <span className="rounded-full bg-muted px-2 py-0.5">previously labeled</span>
            )}
          </div>
        </div>

        {/* Judge score collapsible panel trigger */}
        <button
          type="button"
          onClick={() => setJudgePanelOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-foreground ring-1 ring-border hover:bg-muted"
          aria-expanded={judgePanelOpen}
          aria-controls={`judge-panel-${item.messageId}`}
        >
          <ScaleIcon className="size-3.5" aria-hidden />
          {item.judgeScore !== null
            ? t('judgeScore', { score: Math.round(item.judgeScore) })
            : t('noJudgeYet')}
          {judgePanelOpen ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
        </button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Judge reasoning */}
        {judgePanelOpen && item.judgeReasoning && (
          <div
            id={`judge-panel-${item.messageId}`}
            className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground"
            role="region"
            aria-label="Judge reasoning"
          >
            <p className="mb-1 text-xs font-semibold tracking-wide text-foreground/80 uppercase">
              {t('judgeReasoning')}
            </p>
            <p className="whitespace-pre-wrap">{item.judgeReasoning}</p>
          </div>
        )}

        {/* Conversation thread */}
        <MessageThread message={item} />

        {/* Quality score */}
        <div className="space-y-1.5">
          <Label>{t('scoreLabel')}</Label>
          <QualityChip
            value={score}
            onChange={(s) => setScore(s)}
            judgeScore={item.judgeScore}
            disabled={submitting}
            enableKeyboard={isFocused}
          />
        </div>

        {/* Correction (conditional emphasis) */}
        <CorrectionEditor
          draftKey={item.messageId}
          value={correction}
          onChange={setCorrection}
          onSubmit={handleSubmit}
          required={correctionRequired}
          disabled={submitting}
        />

        {/* Clinical notes (optional) */}
        <div className="space-y-1.5">
          <Label htmlFor={`notes-${item.messageId}`} className="text-xs text-muted-foreground">
            Clinical notes (optional)
          </Label>
          <Input
            id={`notes-${item.messageId}`}
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            placeholder={t('clinicalNotesPlaceholder')}
            disabled={submitting}
            maxLength={5000}
          />
        </div>

        {/* Category + isCorrect */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`cat-${item.messageId}`} className="text-xs text-muted-foreground">
              Category
            </Label>
            <Input
              id={`cat-${item.messageId}`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t('categoryPlaceholder')}
              disabled={submitting}
              maxLength={100}
            />
          </div>
          <div className="flex items-end gap-3">
            <Switch
              id={`correct-${item.messageId}`}
              checked={isCorrect}
              onCheckedChange={setIsCorrect}
              disabled={submitting}
            />
            <Label htmlFor={`correct-${item.messageId}`} className="text-sm">
              {t('isCorrect')}
            </Label>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
        {onSkip && (
          <Button type="button" variant="ghost" onClick={onSkip} disabled={submitting}>
            <SkipForward className="size-4" aria-hidden /> {t('skip')}
          </Button>
        )}
        <LoadingButton
          onClick={handleSubmit}
          loading={submitting}
          loadingText={t('submitting')}
          disabled={!canSubmit}
        >
          {t('submit')}
        </LoadingButton>
      </CardFooter>
    </Card>
  );
}
