'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Toast / Snackbar — Part 15.10 + Part 11 + Part 12.17.
 * z-toast (above modal so alerts always show). Bottom on mobile, ABOVE the tab-bar.
 * - Non-essential confirmation: auto-dismiss, role="status", visual timer, hover-pause.
 * - With an action (e.g. Undo): NO auto-dismiss, role="dialog", focusable + Esc.
 * - Destructive action → always offer Undo.
 * Transform/opacity rise (Part 9), reduced-motion safe.
 */
export interface ToastData {
  id: string;
  tone?: 'neutral' | 'success' | 'error';
  title: React.ReactNode;
  /** If set, the toast persists (no auto-dismiss) and exposes this action. */
  action?: { label: string; onAction: () => void };
  /** ms; ignored when an action is present. */
  duration?: number;
}

interface ToastCtx {
  toasts: ToastData[];
  notify: (t: Omit<ToastData, 'id'>) => string;
  dismiss: (id: string) => void;
}
const Ctx = React.createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);
  const dismiss = React.useCallback(
    (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );
  const notify = React.useCallback((t: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((cur) => [...cur, { ...t, id }]);
    return id;
  }, []);
  return (
    <Ctx.Provider value={{ toasts, notify, dismiss }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

function Toaster({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
  return (
    <div className="dtn-toaster" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <Toast key={t.id} data={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function Toast({ data, onDismiss }: { data: ToastData; onDismiss: () => void }) {
  const hasAction = !!data.action;
  const duration = data.duration ?? 5000;
  const [paused, setPaused] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Auto-dismiss only for actionless toasts; hover/focus pauses (Part 15.10).
  React.useEffect(() => {
    if (hasAction || paused) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [hasAction, paused, duration, onDismiss]);

  // Action toasts behave like a small dialog: focus + Esc to dismiss.
  React.useEffect(() => {
    if (hasAction) ref.current?.focus();
  }, [hasAction]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (hasAction && e.key === 'Escape') onDismiss();
  };

  return (
    <div
      ref={ref}
      className={cn('dtn-toast', `dtn-toast--${data.tone ?? 'neutral'}`)}
      role={hasAction ? 'dialog' : 'status'}
      aria-live={hasAction ? undefined : 'polite'}
      aria-label={hasAction && typeof data.title === 'string' ? data.title : undefined}
      tabIndex={hasAction ? -1 : undefined}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="dtn-toast__title">{data.title}</span>
      {data.action && (
        <button
          type="button"
          className="dtn-toast__action"
          onClick={() => {
            data.action!.onAction();
            onDismiss();
          }}
        >
          {data.action.label}
        </button>
      )}
      <button type="button" className="dtn-toast__close" aria-label="Dismiss" onClick={onDismiss}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="16" height="16">
          <path
            d="M6 6l12 12M18 6 6 18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {!hasAction && !paused && (
        <span
          className="dtn-toast__timer"
          style={{ animationDuration: `${duration}ms` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
