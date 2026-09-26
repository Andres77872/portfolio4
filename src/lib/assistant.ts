import { getChatServiceConfig } from '@/config/chatConfig';

/** Opens the portfolio assistant from anywhere on the page. It never sends a message by itself. */
export interface AskAssistantDetail {
  /** Pre-focuses the conversation on this project. */
  projectSlug?: string;
}

export const ASK_ASSISTANT_EVENT = 'portfolio:ask-assistant';

export function askAssistant(detail: AskAssistantDetail = {}): void {
  window.dispatchEvent(new CustomEvent<AskAssistantDetail>(ASK_ASSISTANT_EVENT, { detail }));
}

export function subscribeAskAssistant(handler: (detail: AskAssistantDetail) => void): () => void {
  const listener = (event: Event) => {
    // Any script can dispatch this event, so only a string slug is passed through.
    const detail = (event as CustomEvent<unknown>).detail as AskAssistantDetail | null | undefined;
    const projectSlug = detail?.projectSlug;
    handler(typeof projectSlug === 'string' && projectSlug ? { projectSlug } : {});
  };

  window.addEventListener(ASK_ASSISTANT_EVENT, listener);
  return () => window.removeEventListener(ASK_ASSISTANT_EVENT, listener);
}

let available: boolean | null = null;

/** Memoized; false when getChatServiceConfig() throws. Logs console.warn once with the message (all envs). */
export function isAssistantAvailable(): boolean {
  if (available === null) {
    try {
      getChatServiceConfig();
      available = true;
    } catch (error) {
      available = false;
      console.warn(`[portfolio-assistant] disabled: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return available;
}

export function __resetAssistantAvailabilityForTests(): void {
  available = null;
}
