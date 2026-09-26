import { createContext, useContext } from 'react';

import { focusSection } from '@/lib/scroll';

import type { Announce } from './chatAnnouncerContext';
import type { PanelLayout } from './hooks/usePanelLayout';

export interface HideOptions {
  /** Return focus to the element that opened the chat (default true). */
  restoreFocus?: boolean;
}

export interface ChatNav {
  layout: PanelLayout;
  onHide(options?: HideOptions): void;
  announce: Announce;
}

const noop = () => undefined;

export const ChatNavContext = createContext<ChatNav>({ layout: 'floating', onHide: noop, announce: noop });

export function useChatNav(): ChatNav {
  return useContext(ChatNavContext);
}

/**
 * Runs an in-page navigation started from the chat. The floating panel stays open and focus
 * stays in it, so the result is announced. The sheet covers the page, so it hides first and
 * focus moves to the target section once the page is interactive again.
 */
export function navigateFromChat(nav: ChatNav, sectionId: string, action: () => void, announcement?: string): void {
  if (nav.layout === 'sheet') {
    nav.onHide({ restoreFocus: false });
    requestAnimationFrame(() => {
      action();
      focusSection(sectionId);
    });
    return;
  }

  action();
  if (announcement) nav.announce(announcement);
}
