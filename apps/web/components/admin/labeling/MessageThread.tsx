// ═══════════════════════════════════════════════════════════════
// MESSAGE THREAD — Read-only conversation display
// Task #44 Phase 3
//
// Layout:
//   - User messages — left-aligned, neutral bubble
//   - Assistant messages — right-aligned, primary-tinted bubble
//   - System events — centered divider with subtle styling
//
// Includes correlationId footer (debug aid — copy-to-clipboard).
// ═══════════════════════════════════════════════════════════════

'use client';

import { cn } from '@/lib/utils';
import type { LabelingQueueItem } from '@repo/shared';

interface MessageThreadProps {
  /** The focal message being labeled. */
  message: LabelingQueueItem;
  /** Sibling messages for context (sequenced). */
  contextMessages?: readonly LabelingQueueItem[];
}

function MessageBubble({ msg, isFocal }: { msg: LabelingQueueItem; isFocal: boolean }) {
  const isUser = msg.role === 'USER';
  const isSystem = msg.role === 'SYSTEM';

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
          {msg.content.slice(0, 80)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex w-full', isUser ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser ? 'bg-muted text-foreground' : 'bg-primary/10 text-foreground',
          isFocal && !isUser && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        )}
      >
        <p className="break-words whitespace-pre-wrap">{msg.content}</p>
        {msg.aiModel && !isUser && (
          <p className="mt-1.5 text-xs text-muted-foreground/70">
            {msg.aiProvider} / {msg.aiModel}
          </p>
        )}
      </div>
    </div>
  );
}

export function MessageThread({ message, contextMessages = [] }: MessageThreadProps) {
  const all = [...contextMessages, message].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  return (
    <div className="space-y-3" aria-label="Conversation context">
      {message.chiefComplaintSnippet && (
        <p className="text-xs text-muted-foreground italic">
          Chief complaint: &ldquo;{message.chiefComplaintSnippet}&rdquo;
        </p>
      )}
      <div className="space-y-2 rounded-lg border border-border bg-background p-3">
        {all.map((m) => (
          <MessageBubble key={m.messageId} msg={m} isFocal={m.messageId === message.messageId} />
        ))}
      </div>
    </div>
  );
}
