import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

// Radix dialogs and sheets own Escape while they are open (they also preventDefault when dismissing).
const RADIX_LAYER_SELECTOR = '[data-slot="dialog-content"],[data-slot="sheet-content"]';

/** True when an Escape with this target belongs to the chat: focus is in the panel, or nowhere. */
export const isPanelEscapeTarget = (target: EventTarget | null, frame: HTMLElement | null): boolean =>
  target === document.body || (target instanceof Node && Boolean(frame?.contains(target)));

/**
 * Document-level Escape (bubble phase) while the panel is open. It works even when focus
 * fell to <body>, and stands aside for composing input, Radix layers and a panel that a
 * modal has hidden (an `aria-hidden` ancestor). `onEscape` decides what the key does.
 */
export function useChatEscape(
  frameRef: RefObject<HTMLElement>,
  active: boolean,
  onEscape: (event: KeyboardEvent) => void,
): void {
  const handlerRef = useRef(onEscape);

  useLayoutEffect(() => {
    handlerRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
      if (document.querySelector(RADIX_LAYER_SELECTOR)) return;
      const frame = frameRef.current;
      if (!frame || frame.closest('[aria-hidden="true"]')) return;
      handlerRef.current(event);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, frameRef]);
}

export default useChatEscape;
