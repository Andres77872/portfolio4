import { useEffect, type RefObject } from 'react';

/**
 * Writes the visual viewport's height and offset to `--chat-vvh`/`--chat-vvt` on `target`,
 * at most once per frame, so the sheet follows the on-screen keyboard without touching the
 * viewport meta tag. The variables are removed when inactive; CSS falls back to 100dvh.
 */
export function useVisualViewportVars(targetRef: RefObject<HTMLElement>, active: boolean): void {
  useEffect(() => {
    const target = targetRef.current;
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!active || !target || !viewport) return;

    let frame = 0;
    const write = () => {
      frame = 0;
      target.style.setProperty('--chat-vvh', `${viewport.height}px`);
      target.style.setProperty('--chat-vvt', `${viewport.offsetTop}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };

    write();
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);

    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      target.style.removeProperty('--chat-vvh');
      target.style.removeProperty('--chat-vvt');
    };
  }, [active, targetRef]);
}

export default useVisualViewportVars;
