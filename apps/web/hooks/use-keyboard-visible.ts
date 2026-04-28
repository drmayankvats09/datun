// ═══════════════════════════════════════════════════════════════
// USE-KEYBOARD-VISIBLE — Detect mobile keyboard open/closed
// When keyboard opens, viewport shrinks. Bottom nav hides.
// Uses visualViewport API (modern browsers).
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';

/**
 * Returns true when mobile virtual keyboard is visible.
 * Uses visualViewport API to detect viewport height reduction.
 *
 * @example
 * const keyboardVisible = useKeyboardVisible();
 * if (keyboardVisible) hideBottomNav();
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const initialHeight = window.innerHeight;

    function onResize() {
      if (!vv) return;
      // Keyboard open = viewport height significantly smaller than window height
      const heightDiff = initialHeight - vv.height;
      // P4-F16: Only true if input/textarea actually focused (eliminates scroll bounce false positives)
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable);
      setVisible(heightDiff > 150 && isInputFocused);
    }

    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  return visible;
}
