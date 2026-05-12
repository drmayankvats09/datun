// ═══════════════════════════════════════════════════════════════
// CORRECTION EDITOR — Markdown-friendly textarea with auto-save
// Task #44 Phase 3
//
// Features:
//   - Required-aware (score ≤ 2 enforces correction)
//   - Auto-save draft to localStorage every 5 seconds
//   - Cmd/Ctrl + Enter triggers submit callback (form-friendly)
//   - Tab inserts indentation (preserves markdown lists)
//   - Character count + max 5000 (matches backend Zod limit)
//
// Pattern: GitHub PR comment editor, Linear issue body.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const AUTO_SAVE_INTERVAL_MS = 5_000;
const MAX_CHARS = 5_000;
const DRAFT_KEY_PREFIX = 'datun-label-draft:';

interface CorrectionEditorProps {
  /** Stable identifier (e.g., messageId) — used for localStorage draft key. */
  draftKey: string;
  /** Current value. */
  value: string;
  onChange: (v: string) => void;
  /** Submit callback bound to Cmd/Ctrl + Enter. */
  onSubmit?: () => void;
  /** Force "required" styling (e.g., when score ≤ 2). */
  required?: boolean;
  /** Disable interaction. */
  disabled?: boolean;
}

export function CorrectionEditor({
  draftKey,
  value,
  onChange,
  onSubmit,
  required = false,
  disabled = false,
}: CorrectionEditorProps) {
  const t = useTranslations('admin.labeling.card');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const [showDraftRestored, setShowDraftRestored] = useState(false);

  // ── Hydrate draft on mount ──
  useEffect(() => {
    const stored = localStorage.getItem(`${DRAFT_KEY_PREFIX}${draftKey}`);
    if (stored && stored !== value && stored.length > 0) {
      onChange(stored);
      setShowDraftRestored(true);
      const timer = window.setTimeout(() => setShowDraftRestored(false), 2_000);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // ── Periodic auto-save ──
  useEffect(() => {
    if (value.length === 0) return;
    const id = window.setInterval(() => {
      try {
        localStorage.setItem(`${DRAFT_KEY_PREFIX}${draftKey}`, value);
      } catch {
        /* iOS quota — silent */
      }
    }, AUTO_SAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [value, draftKey]);

  // ── Keyboard handlers ──
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl + Enter → submit
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit) {
      e.preventDefault();
      onSubmit();
      return;
    }
    // Tab → 2 spaces indent
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = `${value.slice(0, start)}  ${value.slice(end)}`;
      onChange(newValue);
      // Restore cursor position after React re-render
      window.requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }

  const charCount = value.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId} className="flex items-center justify-between">
        <span className={cn(required && 'after:ml-0.5 after:text-destructive after:content-["*"]')}>
          Correction
        </span>
        <span
          className={cn(
            'text-xs',
            isOverLimit
              ? 'text-destructive'
              : charCount > MAX_CHARS * 0.9
                ? 'text-amber-600'
                : 'text-muted-foreground/70',
          )}
          aria-live="polite"
        >
          {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </span>
      </Label>
      <Textarea
        ref={textareaRef}
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={handleKeyDown}
        placeholder={t('correctionPlaceholder')}
        required={required}
        disabled={disabled}
        rows={4}
        aria-invalid={isOverLimit || (required && value.length === 0)}
        className="resize-y font-mono text-sm"
      />
      {showDraftRestored && (
        <p className="text-xs text-emerald-600" role="status">
          Draft restored
        </p>
      )}
    </div>
  );
}
