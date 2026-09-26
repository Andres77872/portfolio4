import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { prefersReducedMotion } from '@/lib/scroll';

/** Within this distance of the bottom the view sticks again. */
const STICK_THRESHOLD_PX = 16;
const UNSTICK_KEYS = new Set(['PageUp', 'ArrowUp', 'Home']);

export interface StickToBottom {
  stuck: boolean;
  /** Unstuck and new content arrived: offer "Jump to latest". */
  showJump: boolean;
  forceStick(): void;
  jumpToLatest(): void;
}

/**
 * Keeps a scroll region pinned to its newest content while the visitor has not scrolled
 * away. Only user intent unsticks it (wheel or touch upward, PageUp/ArrowUp/Home, or a
 * scroll up that the hook did not cause), never a size heuristic.
 *
 * `contentKey` drives the fallback for browsers without ResizeObserver.
 */
export function useStickToBottom(
  regionRef: RefObject<HTMLElement>,
  contentRef: RefObject<HTMLElement>,
  contentKey?: unknown,
): StickToBottom {
  const [stuck, setStuckState] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const stuckRef = useRef(true);
  const lastTopRef = useRef(0);
  const programmaticRef = useRef(false);

  const setStuck = useCallback((value: boolean) => {
    stuckRef.current = value;
    setStuckState(value);
    if (value) setHasNew(false);
  }, []);

  const scrollToEnd = useCallback(() => {
    const region = regionRef.current;
    if (!region) return;
    const before = region.scrollTop;
    region.scrollTop = region.scrollHeight;
    // Only a real position change fires a scroll event that must be ignored.
    if (region.scrollTop !== before) programmaticRef.current = true;
    lastTopRef.current = region.scrollTop;
  }, [regionRef]);

  const handleContentChange = useCallback(() => {
    if (stuckRef.current) scrollToEnd();
    else setHasNew(true);
  }, [scrollToEnd]);

  useEffect(() => {
    const content = contentRef.current;
    const region = regionRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    // The region shrinks too (context bar, taller composer, window resize); a stuck view stays
    // pinned then, but a resize alone is not new content.
    const observer = new ResizeObserver((entries) => {
      if (entries.some((entry) => entry.target === content)) handleContentChange();
      else if (stuckRef.current) scrollToEnd();
    });
    observer.observe(content);
    if (region) observer.observe(region);
    return () => observer.disconnect();
  }, [contentRef, regionRef, handleContentChange, scrollToEnd]);

  useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') handleContentChange();
  }, [contentKey, handleContentChange]);

  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;

    const unstick = () => {
      if (stuckRef.current) setStuck(false);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) unstick();
    };

    let touchY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (y === undefined) return;
      // A finger moving down drags the content down, which reveals older messages.
      if (touchY !== null && y > touchY) unstick();
      touchY = y;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (UNSTICK_KEYS.has(event.key)) unstick();
    };

    const onScroll = () => {
      const top = region.scrollTop;
      const atBottom = region.scrollHeight - top - region.clientHeight <= STICK_THRESHOLD_PX;

      if (programmaticRef.current) {
        programmaticRef.current = false;
      } else if (top < lastTopRef.current && !atBottom) {
        unstick();
      } else if (atBottom && !stuckRef.current) {
        setStuck(true);
      }
      lastTopRef.current = top;
    };

    region.addEventListener('wheel', onWheel, { passive: true });
    region.addEventListener('touchstart', onTouchStart, { passive: true });
    region.addEventListener('touchmove', onTouchMove, { passive: true });
    region.addEventListener('keydown', onKeyDown);
    region.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      region.removeEventListener('wheel', onWheel);
      region.removeEventListener('touchstart', onTouchStart);
      region.removeEventListener('touchmove', onTouchMove);
      region.removeEventListener('keydown', onKeyDown);
      region.removeEventListener('scroll', onScroll);
    };
  }, [regionRef, setStuck]);

  const forceStick = useCallback(() => {
    setStuck(true);
    scrollToEnd();
  }, [scrollToEnd, setStuck]);

  const jumpToLatest = useCallback(() => {
    const region = regionRef.current;
    setStuck(true);
    region?.scrollTo({ top: region.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [regionRef, setStuck]);

  return { stuck, showJump: !stuck && hasNew, forceStick, jumpToLatest };
}

export default useStickToBottom;
