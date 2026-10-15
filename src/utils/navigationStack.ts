// Universal Navigation Stack and Back-button Manager
// Supports Android hardware/gesture back button, browser popstate, and modal close stack

type BackHandler = () => boolean;

const modalHandlerStack: BackHandler[] = [];
const tabHistoryStack: string[] = [];
let exitConfirmationListener: ((show: boolean) => void) | null = null;
let isExitConfirmationVisible = false;

/**
 * Register a dismiss handler for an open modal/drawer/popup.
 * Returns an unregister function to call when the modal closes naturally.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  modalHandlerStack.push(handler);
  // Push a state into browser history so hardware/browser back triggers popstate
  if (typeof window !== 'undefined' && window.history) {
    try {
      window.history.pushState({ modalDepth: modalHandlerStack.length }, '');
    } catch {
      // ignore
    }
  }

  return () => {
    const idx = modalHandlerStack.lastIndexOf(handler);
    if (idx !== -1) {
      modalHandlerStack.splice(idx, 1);
    }
  };
}

/**
 * Push visited tab into tab history stack.
 */
export function pushTabHistory(tab: string) {
  if (tabHistoryStack.length === 0 || tabHistoryStack[tabHistoryStack.length - 1] !== tab) {
    tabHistoryStack.push(tab);
    if (typeof window !== 'undefined' && window.history) {
      try {
        window.history.pushState({ tab }, '');
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Pop previous tab from tab history stack.
 */
export function popTabHistory(): string | null {
  if (tabHistoryStack.length <= 1) {
    return null;
  }
  // Remove current tab
  tabHistoryStack.pop();
  // Return previous tab
  return tabHistoryStack[tabHistoryStack.length - 1] || null;
}

/**
 * Clear tab history (e.g. on panel switch or logout)
 */
export function clearTabHistory(initialTab?: string) {
  tabHistoryStack.length = 0;
  if (initialTab) {
    tabHistoryStack.push(initialTab);
  }
}

/**
 * Register the exit confirmation dialog toggle callback (rendered in App.tsx)
 */
export function setExitConfirmationListener(listener: ((show: boolean) => void) | null) {
  exitConfirmationListener = listener;
}

export function setExitConfirmationVisible(visible: boolean) {
  isExitConfirmationVisible = visible;
  if (exitConfirmationListener) {
    exitConfirmationListener(visible);
  }
}

/**
 * Handle Back action triggered by Android WebView (window.handleAndroidBack) or Browser popstate.
 * Returns true if action was handled inside the app, false if default exit should occur.
 */
export function handleBackAction(): boolean {
  // 1. If Exit Confirmation dialog is already open, pressing back dismisses it
  if (isExitConfirmationVisible) {
    setExitConfirmationVisible(false);
    return true;
  }

  // 2. If any modal / popup is open, close the topmost one
  while (modalHandlerStack.length > 0) {
    const handler = modalHandlerStack.pop();
    if (handler) {
      const handled = handler();
      if (handled) {
        return true;
      }
    }
  }

  // 3. If there is a previous tab in the history stack, navigate back to it
  const prevTab = popTabHistory();
  if (prevTab) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('NAVIGATE_TAB', { detail: prevTab }));
    }
    return true;
  }

  // 4. We are at the root / first screen. Show exit confirmation dialog instead of abrupt exit!
  setExitConfirmationVisible(true);
  return true;
}

// Initialize global window bridge for Android WebView and Browser popstate
if (typeof window !== 'undefined') {
  (window as any).handleAndroidBack = () => {
    return handleBackAction();
  };

  // Push initial state to trap popstate
  try {
    if (window.history.state === null) {
      window.history.replaceState({ root: true }, '');
    }
  } catch {
    // ignore
  }

  window.addEventListener('popstate', (e) => {
    const handled = handleBackAction();
    if (handled) {
      // Re-push state so future back presses continue to be intercepted
      try {
        window.history.pushState({ app: 'tahzib' }, '');
      } catch {
        // ignore
      }
    }
  });
}
