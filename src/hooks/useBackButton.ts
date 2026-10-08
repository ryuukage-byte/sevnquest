import { useEffect, useRef } from 'react';

type BackHandler = () => boolean | void;

interface StackItem {
  id: string;
  handler: BackHandler;
}

const stack: StackItem[] = [];
let unwindCount = 0;
const poppedByPopstateIds = new Set<string>();

// Global popstate event interceptor (one listener for the entire window)
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    // If popstate was triggered by our internal unwind (e.g. user clicked an X or Back button in UI), ignore it
    if (unwindCount > 0) {
      unwindCount--;
      return;
    }

    if (stack.length > 0) {
      const top = stack.pop()!;
      poppedByPopstateIds.add(top.id);

      const result = top.handler();

      if (result === false) {
        // User/component handled an internal sub-step or cancelled; preserve trap
        poppedByPopstateIds.delete(top.id);
        window.history.pushState({ nqBackId: top.id }, '', window.location.href);
        stack.push(top);
      } else {
        // Clear safety after 1 second in case cleanup was already handled
        setTimeout(() => {
          poppedByPopstateIds.delete(top.id);
        }, 1000);
      }
    }
  });
}

let idCounter = 0;

/**
 * Universal hook to intercept the hardware/system back button on mobile devices (Android/iOS)
 * and browser back button, supporting multiple nested stacks (modals, sub-views, drilldowns).
 * 
 * @param isActive Whether the back button interception is currently active.
 * @param onBack Callback function when the back button is pressed.
 *        If it returns `false`, the back action is aborted (or sub-step handled),
 *        and the hook will re-push the state to maintain the trap.
 * @param customId Optional identifier for debugging or specific matching.
 */
export function useBackButton(
  isActive: boolean,
  onBack: () => boolean | void,
  customId?: string
) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;

    const id = customId ? `${customId}_${++idCounter}` : `back_handler_${++idCounter}`;
    window.history.pushState({ nqBackId: id }, '', window.location.href);

    const item: StackItem = {
      id,
      handler: () => onBackRef.current()
    };
    stack.push(item);

    let isUnregistered = false;

    return () => {
      if (isUnregistered) return;
      isUnregistered = true;

      // Remove from stack if still present
      const idx = stack.findIndex(s => s.id === id);
      if (idx !== -1) {
        stack.splice(idx, 1);
      }

      // Check if this unmount was caused by mobile/browser popstate or by in-app UI click
      if (poppedByPopstateIds.has(id)) {
        poppedByPopstateIds.delete(id);
      } else if (typeof window !== 'undefined') {
        // Closed by UI action (e.g. user clicked X or Back button on screen)
        // Cleanly pop the browser history entry that we pushed
        unwindCount++;
        window.history.back();
        // Fallback safety to reset unwindCount if browser drops popstate
        setTimeout(() => {
          unwindCount = Math.max(0, unwindCount - 1);
        }, 500);
      }
    };
  }, [isActive, customId]);
}
