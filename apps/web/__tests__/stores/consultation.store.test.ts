// ═══════════════════════════════════════════════════════════════
// CONSULTATION STORE TESTS — Comprehensive slice + middleware coverage
//
// Tests the Phase 2 refactored consultation store:
//   - Core lifecycle (start, resume, clear, setStatus, markSaved)
//   - Messages slice (add/setBatch/clear with dedup)
//   - Intake slice (draft updates + language interlock)
//   - Media slice (photo state machine + transition validation)
//   - Streaming slice (start/append/finish/abort with no-op guards)
//
// Pattern: Zustand official testing guide + Cal.com / Linear store tests.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { useConsultationStore, type ChatMessage } from '../../stores/consultation.store';

// ─── Test fixtures ────────────────────────────────────────────

const makeMessage = (
  id: string,
  role: ChatMessage['role'] = 'user',
  content = 'test',
): ChatMessage => ({
  id,
  role,
  content,
  timestamp: Date.now(),
});

const EMPTY_DRAFT = {
  name: '',
  age: '',
  gender: '',
  language: 'en',
};

/**
 * Reset the consultation store to a clean baseline before each test.
 * Using a full setState (not the action) so we touch every state field
 * including the Phase 2 additions (photos, streaming, hydration).
 */
function resetStore(): void {
  useConsultationStore.setState({
    activeConsultationId: null,
    clientUuid: null,
    messages: [],
    intakeDraft: { ...EMPTY_DRAFT },
    status: 'idle',
    language: 'en',
    hasUnsavedChanges: false,
    photos: {},
    streamingMessageId: null,
    streamingContent: '',
    isStreaming: false,
    lastStreamError: null,
    __hasHydrated: false,
  });
}

describe('Consultation Store — Core lifecycle', () => {
  beforeEach(resetStore);

  it('starts with a clean idle state', () => {
    const s = useConsultationStore.getState();
    expect(s.activeConsultationId).toBeNull();
    expect(s.clientUuid).toBeNull();
    expect(s.messages).toEqual([]);
    expect(s.status).toBe('idle');
    expect(s.hasUnsavedChanges).toBe(false);
  });

  it('startConsultation sets ID + clientUuid + status', () => {
    useConsultationStore.getState().startConsultation('c-001', 'uuid-001');
    const s = useConsultationStore.getState();
    expect(s.activeConsultationId).toBe('c-001');
    expect(s.clientUuid).toBe('uuid-001');
    expect(s.status).toBe('in_progress');
    expect(s.messages).toEqual([]);
    expect(s.hasUnsavedChanges).toBe(false);
  });

  it('startConsultation wipes prior streaming state', () => {
    useConsultationStore.setState({
      streamingMessageId: 'old-stream',
      streamingContent: 'partial',
      isStreaming: true,
      lastStreamError: 'old error',
    });
    useConsultationStore.getState().startConsultation('c-002', 'uuid-002');
    const s = useConsultationStore.getState();
    expect(s.streamingMessageId).toBeNull();
    expect(s.streamingContent).toBe('');
    expect(s.isStreaming).toBe(false);
    expect(s.lastStreamError).toBeNull();
  });

  it('resumeConsultation loads messages + status atomically', () => {
    const msgs = [makeMessage('m1'), makeMessage('m2', 'assistant')];
    useConsultationStore.getState().resumeConsultation('c-003', msgs, 'in_progress');
    const s = useConsultationStore.getState();
    expect(s.activeConsultationId).toBe('c-003');
    expect(s.messages).toEqual(msgs);
    expect(s.status).toBe('in_progress');
    expect(s.hasUnsavedChanges).toBe(false);
  });

  it('setStatus updates status only', () => {
    useConsultationStore.getState().setStatus('completed');
    expect(useConsultationStore.getState().status).toBe('completed');
  });

  it('markSaved flips hasUnsavedChanges to false', () => {
    useConsultationStore.setState({ hasUnsavedChanges: true });
    useConsultationStore.getState().markSaved();
    expect(useConsultationStore.getState().hasUnsavedChanges).toBe(false);
  });

  it('clearConsultation wipes everything but preserves language', () => {
    useConsultationStore.setState({
      activeConsultationId: 'c-x',
      messages: [makeMessage('m1')],
      language: 'hi',
      intakeDraft: { name: 'X', age: '30', gender: 'M', language: 'hi' },
      photos: { p1: { id: 'p1' } as never },
      streamingMessageId: 'stream-1',
      isStreaming: true,
    });
    useConsultationStore.getState().clearConsultation();
    const s = useConsultationStore.getState();
    expect(s.activeConsultationId).toBeNull();
    expect(s.messages).toEqual([]);
    expect(s.photos).toEqual({});
    expect(s.streamingMessageId).toBeNull();
    expect(s.isStreaming).toBe(false);
    // language preserved:
    expect(s.language).toBe('hi');
    // intakeDraft reset but its language matches the preserved top-level lang:
    expect(s.intakeDraft).toEqual({ name: '', age: '', gender: '', language: 'hi' });
  });
});

describe('Consultation Store — Messages slice', () => {
  beforeEach(resetStore);

  it('addMessage appends and sets hasUnsavedChanges', () => {
    useConsultationStore.getState().addMessage(makeMessage('m1'));
    const s = useConsultationStore.getState();
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]!.id).toBe('m1');
    expect(s.hasUnsavedChanges).toBe(true);
  });

  it('addMessage dedupes by ID (idempotency for network retries)', () => {
    const m = makeMessage('dup-1');
    useConsultationStore.getState().addMessage(m);
    useConsultationStore.getState().addMessage(m);
    useConsultationStore.getState().addMessage(m);
    expect(useConsultationStore.getState().messages).toHaveLength(1);
  });

  it('setMessages replaces array and resets hasUnsavedChanges', () => {
    const msgs = [makeMessage('m1'), makeMessage('m2'), makeMessage('m3')];
    useConsultationStore.setState({ hasUnsavedChanges: true });
    useConsultationStore.getState().setMessages(msgs);
    const s = useConsultationStore.getState();
    expect(s.messages).toEqual(msgs);
    expect(s.hasUnsavedChanges).toBe(false);
  });

  it('clearMessages wipes messages and resets hasUnsavedChanges', () => {
    useConsultationStore.setState({
      messages: [makeMessage('m1')],
      hasUnsavedChanges: true,
    });
    useConsultationStore.getState().clearMessages();
    const s = useConsultationStore.getState();
    expect(s.messages).toEqual([]);
    expect(s.hasUnsavedChanges).toBe(false);
  });
});

describe('Consultation Store — Intake slice', () => {
  beforeEach(resetStore);

  it('updateIntakeDraft partial-merges fields', () => {
    useConsultationStore.getState().updateIntakeDraft({ name: 'Mayank' });
    useConsultationStore.getState().updateIntakeDraft({ age: '26' });
    const s = useConsultationStore.getState();
    expect(s.intakeDraft.name).toBe('Mayank');
    expect(s.intakeDraft.age).toBe('26');
    expect(s.intakeDraft.gender).toBe(''); // unchanged
    expect(s.hasUnsavedChanges).toBe(true);
  });

  it('setLanguage writes BOTH language and intakeDraft.language (interlock)', () => {
    useConsultationStore.getState().setLanguage('hi');
    const s = useConsultationStore.getState();
    expect(s.language).toBe('hi');
    expect(s.intakeDraft.language).toBe('hi');
  });

  it('clearDraft preserves the active language', () => {
    useConsultationStore.getState().setLanguage('ta');
    useConsultationStore.getState().updateIntakeDraft({ name: 'X', age: '30' });
    useConsultationStore.getState().clearDraft();
    const s = useConsultationStore.getState();
    expect(s.intakeDraft.name).toBe('');
    expect(s.intakeDraft.age).toBe('');
    expect(s.intakeDraft.language).toBe('ta');
    expect(s.language).toBe('ta');
  });
});

describe('Consultation Store — Media slice (state machine)', () => {
  beforeEach(resetStore);

  const makePhotoInput = (id: string) => ({
    id,
    filename: 'tooth.jpg',
    sizeBytes: 12345,
    mimeType: 'image/jpeg',
    localPreviewUrl: `blob:test://${id}`,
  });

  it('enqueuePhoto adds to map with status=queued', () => {
    useConsultationStore.getState().enqueuePhoto(makePhotoInput('p1'));
    const photo = useConsultationStore.getState().photos['p1'];
    expect(photo).toBeDefined();
    expect(photo!.status).toBe('queued');
    expect(photo!.progressPercent).toBe(0);
    expect(photo!.mediaKey).toBeNull();
    expect(photo!.analysis).toBeNull();
    expect(photo!.errorMessage).toBeNull();
  });

  it('setPhotoStatus allows monotonic forward transitions', () => {
    useConsultationStore.getState().enqueuePhoto(makePhotoInput('p1'));
    useConsultationStore.getState().setPhotoStatus('p1', 'uploading');
    expect(useConsultationStore.getState().photos['p1']!.status).toBe('uploading');
  });

  it('setPhotoStatus rejects invalid backward transitions', () => {
    useConsultationStore.getState().enqueuePhoto(makePhotoInput('p1'));
    useConsultationStore.getState().setPhotoStatus('p1', 'uploading');
    useConsultationStore.getState().setPhotoStatus('p1', 'uploaded');
    useConsultationStore.getState().setPhotoStatus('p1', 'analyzed');
    // analyzed is terminal — attempt regression to 'uploading' is a no-op
    useConsultationStore.getState().setPhotoStatus('p1', 'uploading');
    expect(useConsultationStore.getState().photos['p1']!.status).toBe('analyzed');
  });

  it('setPhotoProgress clamps to [0, 100]', () => {
    useConsultationStore.getState().enqueuePhoto(makePhotoInput('p1'));
    useConsultationStore.getState().setPhotoStatus('p1', 'uploading');
    useConsultationStore.getState().setPhotoProgress('p1', -10);
    expect(useConsultationStore.getState().photos['p1']!.progressPercent).toBe(0);
    useConsultationStore.getState().setPhotoProgress('p1', 200);
    expect(useConsultationStore.getState().photos['p1']!.progressPercent).toBe(100);
    useConsultationStore.getState().setPhotoProgress('p1', 42);
    expect(useConsultationStore.getState().photos['p1']!.progressPercent).toBe(42);
  });

  it('setPhotoUploaded sets mediaKey + 100% + status', () => {
    useConsultationStore.getState().enqueuePhoto(makePhotoInput('p1'));
    useConsultationStore.getState().setPhotoStatus('p1', 'uploading');
    useConsultationStore.getState().setPhotoUploaded('p1', 'r2-key-abc');
    const photo = useConsultationStore.getState().photos['p1'];
    expect(photo!.status).toBe('uploaded');
    expect(photo!.mediaKey).toBe('r2-key-abc');
    expect(photo!.progressPercent).toBe(100);
  });

  it('setPhotoAnalyzed transitions only from uploaded', () => {
    useConsultationStore.getState().enqueuePhoto(makePhotoInput('p1'));
    // Direct attempt from 'queued' to 'analyzed' = invalid transition
    useConsultationStore.getState().setPhotoAnalyzed('p1', 'cavity detected');
    expect(useConsultationStore.getState().photos['p1']!.status).toBe('queued');
    expect(useConsultationStore.getState().photos['p1']!.analysis).toBeNull();
  });

  it('setPhotoFailed is reachable from any non-terminal status', () => {
    useConsultationStore.getState().enqueuePhoto(makePhotoInput('p1'));
    useConsultationStore.getState().setPhotoFailed('p1', 'network');
    expect(useConsultationStore.getState().photos['p1']!.status).toBe('failed');
    expect(useConsultationStore.getState().photos['p1']!.errorMessage).toBe('network');
  });

  it('removePhoto deletes by ID, clearPhotos wipes map', () => {
    useConsultationStore.getState().enqueuePhoto(makePhotoInput('p1'));
    useConsultationStore.getState().enqueuePhoto(makePhotoInput('p2'));
    useConsultationStore.getState().removePhoto('p1');
    expect(Object.keys(useConsultationStore.getState().photos)).toEqual(['p2']);
    useConsultationStore.getState().clearPhotos();
    expect(useConsultationStore.getState().photos).toEqual({});
  });

  it('unknown photo ID is a silent no-op', () => {
    useConsultationStore.getState().setPhotoStatus('does-not-exist', 'uploaded');
    useConsultationStore.getState().setPhotoProgress('does-not-exist', 50);
    useConsultationStore.getState().removePhoto('does-not-exist');
    expect(useConsultationStore.getState().photos).toEqual({});
  });
});

describe('Consultation Store — Streaming slice', () => {
  beforeEach(resetStore);

  it('startStreaming sets ID + isStreaming + clears prior content', () => {
    useConsultationStore.setState({
      streamingContent: 'leftover',
      lastStreamError: 'old',
    });
    useConsultationStore.getState().startStreaming('msg-stream-1');
    const s = useConsultationStore.getState();
    expect(s.streamingMessageId).toBe('msg-stream-1');
    expect(s.streamingContent).toBe('');
    expect(s.isStreaming).toBe(true);
    expect(s.lastStreamError).toBeNull();
  });

  it('appendStreamingContent concatenates tokens in order', () => {
    useConsultationStore.getState().startStreaming('msg-1');
    useConsultationStore.getState().appendStreamingContent('Hello');
    useConsultationStore.getState().appendStreamingContent(' ');
    useConsultationStore.getState().appendStreamingContent('world');
    expect(useConsultationStore.getState().streamingContent).toBe('Hello world');
  });

  it('appendStreamingContent is a no-op when no stream is active', () => {
    useConsultationStore.getState().appendStreamingContent('orphan token');
    expect(useConsultationStore.getState().streamingContent).toBe('');
    expect(useConsultationStore.getState().isStreaming).toBe(false);
  });

  it('appendStreamingContent ignores empty chunks (no spurious renders)', () => {
    useConsultationStore.getState().startStreaming('msg-1');
    useConsultationStore.getState().appendStreamingContent('hi');
    useConsultationStore.getState().appendStreamingContent('');
    expect(useConsultationStore.getState().streamingContent).toBe('hi');
  });

  it('finishStreaming resets streaming state cleanly', () => {
    useConsultationStore.getState().startStreaming('msg-1');
    useConsultationStore.getState().appendStreamingContent('done');
    useConsultationStore.getState().finishStreaming();
    const s = useConsultationStore.getState();
    expect(s.streamingMessageId).toBeNull();
    expect(s.streamingContent).toBe('');
    expect(s.isStreaming).toBe(false);
    expect(s.lastStreamError).toBeNull();
  });

  it('abortStreaming sets lastStreamError and resets streaming state', () => {
    useConsultationStore.getState().startStreaming('msg-1');
    useConsultationStore.getState().appendStreamingContent('partial');
    useConsultationStore.getState().abortStreaming('connection lost');
    const s = useConsultationStore.getState();
    expect(s.streamingMessageId).toBeNull();
    expect(s.streamingContent).toBe('');
    expect(s.isStreaming).toBe(false);
    expect(s.lastStreamError).toBe('connection lost');
  });
});
