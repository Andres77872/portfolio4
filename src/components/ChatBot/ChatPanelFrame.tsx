import {
  forwardRef,
  useCallback,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';

import { cn } from '@/lib/utils';

import { DISCLOSURE_ID, PANEL_ID, TITLE_ID } from './constants';
import type { PanelLayout } from './hooks/usePanelLayout';
import { useSheetIsolation } from './hooks/useSheetIsolation';
import { useVisualViewportVars } from './hooks/useVisualViewportVars';

interface ChatPanelFrameProps {
  open: boolean;
  expanded: boolean;
  layout: PanelLayout;
  short: boolean;
  rootRef: RefObject<HTMLElement>;
  children: ReactNode;
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,[tabindex="0"]';

const FRAME_CLASSES = cn(
  // Floating panel (base): clears the fixed site header at every height, no JS clamp.
  'group/panel fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground outline-none',
  'shadow-xl shadow-black/10 dark:shadow-2xl dark:shadow-black/60 dark:ring-1 dark:ring-white/5 contrast-more:border-foreground/60',
  'right-[max(1.25rem,env(safe-area-inset-right))] bottom-[max(1.25rem,env(safe-area-inset-bottom))]',
  'w-[min(var(--chat-w),calc(100vw-2.5rem))] h-[min(var(--chat-h),calc(100dvh-var(--site-header-h)-2.5rem))]',
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out',
  // Full-screen sheet: above the site header, sized to the visual viewport.
  'data-[layout=sheet]:z-[150] data-[layout=sheet]:inset-x-0 data-[layout=sheet]:top-[var(--chat-vvt,0px)] data-[layout=sheet]:bottom-auto',
  'data-[layout=sheet]:h-[var(--chat-vvh,100dvh)] data-[layout=sheet]:w-full data-[layout=sheet]:rounded-none data-[layout=sheet]:border-0',
  'data-[layout=sheet]:shadow-none data-[layout=sheet]:ring-0 data-[layout=sheet]:motion-safe:slide-in-from-bottom-4',
  // The dark: elevation utilities are emitted later at equal specificity, so the sheet repeats its reset for dark.
  'dark:data-[layout=sheet]:shadow-none dark:data-[layout=sheet]:ring-0',
  // Short sheet: the whole sheet scrolls so the composer and disclosure stay reachable.
  'data-[short]:overflow-y-auto data-[short]:overscroll-contain',
);

const isRendered = (element: HTMLElement) => element.getClientRects().length > 0;

/**
 * The positioned `role="dialog"` surface. It stays mounted after the first open and hiding
 * only sets `hidden`, so a running answer survives. In the sheet layout it is modal: the
 * page is inert and scroll-locked, and Tab wraps inside the frame.
 */
const ChatPanelFrame = forwardRef<HTMLDivElement, ChatPanelFrameProps>(function ChatPanelFrame(
  { open, expanded, layout, short, rootRef, children },
  forwardedRef,
) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const sheetActive = open && layout === 'sheet';

  useSheetIsolation(rootRef, sheetActive);
  useVisualViewportVars(frameRef, sheetActive);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      frameRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (layout !== 'sheet' || event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;

    const frame = event.currentTarget;
    const focusables = Array.from(frame.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isRendered);
    if (focusables.length === 0) {
      event.preventDefault();
      frame.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === frame)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const style = {
    '--chat-w': expanded ? '44rem' : '26rem',
    '--chat-h': expanded ? '100dvh' : '40rem',
  } as CSSProperties;

  return (
    <div
      ref={setRefs}
      id={PANEL_ID}
      role="dialog"
      // No aria-modal, even as a sheet: WebKit drops everything outside an aria-modal dialog,
      // including the announcer (a sibling of this frame), so VoiceOver would never speak replies.
      // useSheetIsolation makes the rest of the page inert, which gives the modal behaviour.
      aria-labelledby={TITLE_ID}
      aria-describedby={DISCLOSURE_ID}
      tabIndex={-1}
      hidden={!open}
      data-layout={layout}
      data-short={short || undefined}
      style={style}
      onKeyDown={handleKeyDown}
      className={FRAME_CLASSES}
    >
      {children}
    </div>
  );
});

export default ChatPanelFrame;
