type ChatPanelModule = typeof import('./ChatPanel');

const importChatPanel = (): Promise<ChatPanelModule> => import('./ChatPanel');

let importer = importChatPanel;
let panelPromise: Promise<ChatPanelModule> | null = null;

/**
 * Loads the lazy panel chunk once. A failed import is forgotten, so a later prefetch or
 * "Try again" requests the chunk again instead of replaying the rejection.
 */
export function loadChatPanel(): Promise<ChatPanelModule> {
  panelPromise ??= importer().catch((error: unknown) => {
    panelPromise = null;
    throw error;
  });
  return panelPromise;
}

/** Test hook: swaps the dynamic import (omit to restore it) and forgets any cached load. */
export function __setChatPanelImporterForTests(next?: () => Promise<ChatPanelModule>): void {
  importer = next ?? importChatPanel;
  panelPromise = null;
}
