import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

export interface ChatPanelFocusOptions {
  open: boolean;
  coarse: boolean;
  frameRef: RefObject<HTMLElement>;
  composerRef: RefObject<{ focus(): void }>;
  busy: boolean;
  itemCount: number;
}

const isNowhere = (element: Element | null): boolean => !element || element === document.body;

/**
 * Open focus and the focus safety net for the loaded panel.
 *
 * - Open with a fine pointer: the composer. With a coarse pointer: the frame, so its name and
 *   description are read and no on-screen keyboard pops up.
 * - On mount (the chunk arrived after opening) the composer only takes over while focus is
 *   still on the frame or nowhere, so a visitor who moved on is not pulled back.
 * - Safety net: when an answer settles or the transcript changes and focus fell to <body>
 *   from inside the panel (a removed chip or button), focus returns to the composer.
 */
export function useChatPanelFocus({ open, coarse, frameRef, composerRef, busy, itemCount }: ChatPanelFocusOptions): void {
  const mountedRef = useRef(false);
  const focusInsideRef = useRef(false);
  // Read when the panel opens: a pointer change while it is open (a detached tablet keyboard)
  // must not move focus.
  const coarseRef = useRef(coarse);

  useLayoutEffect(() => {
    coarseRef.current = coarse;
  });

  useEffect(() => {
    if (!open) {
      mountedRef.current = true;
      return;
    }
    const isMount = !mountedRef.current;

    const id = requestAnimationFrame(() => {
      // Set here, not in the effect body: StrictMode's mount/unmount/mount must still count as a mount.
      mountedRef.current = true;
      const frame = frameRef.current;
      if (!frame || frame.hidden) return;
      const active = document.activeElement;
      const onFrameOrNowhere = isNowhere(active) || active === frame;
      const onPanelControl = !onFrameOrNowhere && frame.contains(active);

      if (coarseRef.current) {
        if (!onPanelControl) frame.focus({ preventScroll: true });
      } else if (isMount ? onFrameOrNowhere : !onPanelControl) {
        composerRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [open, frameRef, composerRef]);

  useEffect(() => {
    const isInside = (target: EventTarget | null) =>
      target instanceof Node && Boolean(frameRef.current?.contains(target));
    const onFocusIn = (event: FocusEvent) => {
      focusInsideRef.current = isInside(event.target);
    };
    // Clicking the page background drops focus to <body> without a focusin; that is the
    // visitor leaving, not a removed control, so the safety net must not pull them back.
    const onPointerDown = (event: PointerEvent) => {
      if (!isInside(event.target)) focusInsideRef.current = false;
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [frameRef]);

  const previousRef = useRef({ busy, itemCount });

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = { busy, itemCount };
    const settled = previous.busy && !busy;
    if (!settled && previous.itemCount === itemCount) return;
    if (!open || !focusInsideRef.current || !isNowhere(document.activeElement)) return;
    composerRef.current?.focus();
  }, [busy, itemCount, open, composerRef]);
}

export default useChatPanelFocus;
