// ═══════════════════════════════════════════════════════════════
// USE-BEFOREUNLOAD-SAVE — Save consultation state on tab close
// Pattern: WhatsApp Web, Google Docs — sendBeacon on unload
// guarantees data reaches server even if tab is closing.
//
// Chat 13 discussion: "beforeunload pe navigator.sendBeacon()
// call — browser ki special API jo guarantee karti hai ki
// request bhej di jayegi tab band hone ke baad bhi."
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';
import { useConsultationStore } from '@/stores';

/**
 * Registers beforeunload handler that:
 * 1. Warns user if unsaved consultation changes exist
 * 2. Fires sendBeacon to persist state to server (future API integration)
 *
 * Place in consultation layout or app shell.
 */
export function useBeforeunloadSave(): void {
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      const { hasUnsavedChanges, status, activeConsultationId } = useConsultationStore.getState();

      // Only warn if consultation is active and has unsaved changes
      if (status === 'in_progress' && hasUnsavedChanges && activeConsultationId) {
        // Standard browser prompt
        e.preventDefault();

        // Future: sendBeacon to save consultation state to server
        // const payload = JSON.stringify({
        //   consultationId: activeConsultationId,
        //   messages: useConsultationStore.getState().messages,
        // });
        // navigator.sendBeacon('/api/consultations/autosave', payload);
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
