import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { ChatAnnouncerContext } from './chatAnnouncerContext';

const ANNOUNCE_DELAY_MS = 50;
const ANNOUNCE_CLEAR_MS = 10_000;

/**
 * The chat's only live region. It lives in the eager shell, so it exists before the first
 * send, keeps working while the panel is hidden and survives New chat. Each message is set
 * after a short blank so repeating the same text is announced again.
 */
export function ChatAnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timers = useRef<{ show?: ReturnType<typeof setTimeout>; clear?: ReturnType<typeof setTimeout> }>({});

  const announce = useCallback((text: string) => {
    clearTimeout(timers.current.show);
    clearTimeout(timers.current.clear);
    setMessage('');
    timers.current.show = setTimeout(() => {
      setMessage(text);
      timers.current.clear = setTimeout(() => setMessage(''), ANNOUNCE_CLEAR_MS);
    }, ANNOUNCE_DELAY_MS);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      clearTimeout(pending.show);
      clearTimeout(pending.clear);
    };
  }, []);

  return (
    <ChatAnnouncerContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </div>
    </ChatAnnouncerContext.Provider>
  );
}
