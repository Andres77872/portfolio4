import { createContext, useContext } from 'react';

export type Announce = (message: string) => void;

const noop: Announce = () => undefined;

export const ChatAnnouncerContext = createContext<Announce>(noop);

/** Queues a polite screen reader announcement in the chat's single status region. */
export function useAnnounce(): Announce {
  return useContext(ChatAnnouncerContext);
}
