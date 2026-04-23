// ═══════════════════════════════════════════════════════════════
// CONSULTATION STORE — Chat state + draft persistence
// Core: "reload never loses context" — messages survive
// page reload, tab close, phone lock, app kill.
//
// ADVANCED:
// - beforeunload safety (sendBeacon on tab close)
// - Draft auto-save (intake form survives reload)
// - DevTools integration
// - Message dedup (prevent double-add on network retry)
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { createSafeStorage } from '@/lib/storage';

// ── Types ──

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface IntakeFormDraft {
  name: string;
  age: string;
  gender: string;
  language: string;
}

interface ConsultationState {
  activeConsultationId: string | null;
  clientUuid: string | null;
  messages: ChatMessage[];
  intakeDraft: IntakeFormDraft;
  status: 'idle' | 'intake' | 'in_progress' | 'completed';
  language: string;
  /** Track if there are unsaved changes (for beforeunload) */
  hasUnsavedChanges: boolean;

  startConsultation: (consultationId: string, clientUuid: string) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  updateIntakeDraft: (draft: Partial<IntakeFormDraft>) => void;
  setStatus: (status: ConsultationState['status']) => void;
  setLanguage: (language: string) => void;
  resumeConsultation: (
    consultationId: string,
    messages: ChatMessage[],
    status: ConsultationState['status'],
  ) => void;
  clearConsultation: () => void;
  markSaved: () => void;
}

const EMPTY_DRAFT: IntakeFormDraft = {
  name: '',
  age: '',
  gender: '',
  language: 'en',
};

// ── Store ──

export const useConsultationStore = create<ConsultationState>()(
  devtools(
    persist(
      (set) => ({
        activeConsultationId: null,
        clientUuid: null,
        messages: [],
        intakeDraft: { ...EMPTY_DRAFT },
        status: 'idle',
        language: 'en',
        hasUnsavedChanges: false,

        startConsultation: (consultationId, clientUuid) =>
          set(
            {
              activeConsultationId: consultationId,
              clientUuid,
              messages: [],
              status: 'in_progress',
              hasUnsavedChanges: false,
            },
            false,
            'consultation/start',
          ),

        addMessage: (message) =>
          set(
            (state) => {
              // Dedup: prevent double-add if same message ID exists
              if (state.messages.some((m) => m.id === message.id)) {
                return state;
              }
              return {
                messages: [...state.messages, message],
                hasUnsavedChanges: true,
              };
            },
            false,
            'consultation/addMessage',
          ),

        setMessages: (messages) =>
          set({ messages, hasUnsavedChanges: false }, false, 'consultation/setMessages'),

        updateIntakeDraft: (draft) =>
          set(
            (state) => ({
              intakeDraft: { ...state.intakeDraft, ...draft },
              hasUnsavedChanges: true,
            }),
            false,
            'consultation/updateDraft',
          ),

        setStatus: (status) => set({ status }, false, 'consultation/setStatus'),

        setLanguage: (language) =>
          set(
            (state) => ({
              language,
              intakeDraft: { ...state.intakeDraft, language },
            }),
            false,
            'consultation/setLanguage',
          ),

        resumeConsultation: (consultationId, messages, status) =>
          set(
            {
              activeConsultationId: consultationId,
              messages,
              status,
              hasUnsavedChanges: false,
            },
            false,
            'consultation/resume',
          ),

        clearConsultation: () =>
          set(
            {
              activeConsultationId: null,
              clientUuid: null,
              messages: [],
              intakeDraft: { ...EMPTY_DRAFT },
              status: 'idle',
              hasUnsavedChanges: false,
            },
            false,
            'consultation/clear',
          ),

        markSaved: () => set({ hasUnsavedChanges: false }, false, 'consultation/markSaved'),
      }),
      {
        name: 'datun-consultation',
        version: 1,
        storage: createJSONStorage(() => createSafeStorage()),
        partialize: (state) => ({
          activeConsultationId: state.activeConsultationId,
          clientUuid: state.clientUuid,
          messages: state.messages,
          intakeDraft: state.intakeDraft,
          status: state.status,
          language: state.language,
        }),
        migrate: (persisted, version) => {
          if (version === 0) {
            return {
              ...(persisted as Record<string, unknown>),
              clientUuid: null,
              language: 'en',
              hasUnsavedChanges: false,
            };
          }
          return persisted as ConsultationState;
        },
      },
    ),
    { name: 'ConsultationStore', enabled: process.env.NODE_ENV === 'development' },
  ),
);
