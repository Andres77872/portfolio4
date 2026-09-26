import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { SHOW_WORK_EVENT } from '@/components/Projects/projectLink';
import { isAssistantAvailable, subscribeAskAssistant, type AskAssistantDetail } from '@/lib/assistant';

import { ChatAnnouncerProvider } from './ChatAnnouncer';
import ChatErrorBoundary from './ChatErrorBoundary';
import ChatLauncher from './ChatLauncher';
import type { ChatPanelProps } from './ChatPanel';
import ChatPanelFrame from './ChatPanelFrame';
import ChatPanelSkeleton from './ChatPanelSkeleton';
import type { HideOptions } from './chatNavContext';
import { COMPOSER_ID, PANEL_ID } from './constants';
import { usePanelLayout } from './hooks/usePanelLayout';
import { loadChatPanel } from './loadChatPanel';

const noop = () => undefined;

// While a project modal is open, an "ask" waits for it to close (up to about one second).
const MAX_DEFER_FRAMES = 60;

const isRendered = (element: HTMLElement) => element.getClientRects().length > 0;

const prefetchPanel = () => void loadChatPanel().catch(noop);

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Eager shell: launcher, frame, announcer and the retryable lazy panel. Everything heavy
 * (markdown, the chat service, the prompt builder) lives in the lazy ChatPanel chunk.
 */
function ChatAssistant() {
  const { layout, short, coarse, canExpand } = usePanelLayout();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pendingAsk, setPendingAsk] = useState<AskAssistantDetail | null>(null);
  const [attempt, setAttempt] = useState(0);
  // A fresh lazy component per attempt: React.lazy caches a rejected import forever.
  const [LazyPanel, setLazyPanel] = useState(() => lazy(loadChatPanel));

  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);

  useLayoutEffect(() => {
    openRef.current = open;
  });

  /** `opener: null` means focus was nowhere: an open panel keeps its opener, a closed one falls back to the launcher. */
  const openPanel = useCallback(
    (opener: HTMLElement | null) => {
      if (opener || !openRef.current) openerRef.current = opener ?? launcherRef.current;
      if (openRef.current) {
        // Already open (an ask from the Intro CTA or a project modal): no open transition will
        // move focus, so bring it in the way a fresh open does.
        requestAnimationFrame(() => {
          const frame = frameRef.current;
          if (!frame || frame.hidden || frame.contains(document.activeElement)) return;
          const composer = coarse ? null : document.getElementById(COMPOSER_ID);
          (composer && frame.contains(composer) ? composer : frame).focus({ preventScroll: true });
        });
        return;
      }
      setUnread(false);
      setMounted(true);
      setOpen(true);
      prefetchPanel();
    },
    [coarse],
  );

  const handleLauncherOpen = useCallback(() => {
    const active = document.activeElement;
    openPanel(active instanceof HTMLElement && active !== document.body ? active : launcherRef.current);
  }, [openPanel]);

  const hide = useCallback((options: HideOptions = {}) => {
    setOpen(false);
    if (options.restoreFocus === false) return;

    // After the launcher unhides: back to the opener when it is still on the page, else the launcher.
    requestAnimationFrame(() => {
      if (openRef.current) return;
      const opener = openerRef.current;
      const frame = frameRef.current;
      if (opener && opener.isConnected && isRendered(opener) && !frame?.contains(opener)) {
        opener.focus({ preventScroll: true });
      } else {
        launcherRef.current?.focus({ preventScroll: true });
      }
    });
  }, []);

  const closeFromFrame = useCallback(() => hide(), [hide]);

  // A reply that settles while the panel is hidden marks the launcher.
  const handleReplySettled = useCallback(() => {
    if (!openRef.current) setUnread(true);
  }, []);

  const handleAskConsumed = useCallback(() => setPendingAsk(null), []);
  const toggleExpanded = useCallback(() => setExpanded((value) => !value), []);

  const retryPanel = useCallback(() => {
    setLazyPanel(() => lazy(loadChatPanel));
    setAttempt((value) => value + 1);
  }, []);

  // Work was filtered from the page (e.g. a technology chip in a project opened from the chat):
  // the full-screen sheet would hide the result and keep the page inert, so step aside.
  useEffect(() => {
    if (!open || layout !== 'sheet') return;
    const stepAside = () => hide({ restoreFocus: false });
    window.addEventListener(SHOW_WORK_EVENT, stepAside);
    return () => window.removeEventListener(SHOW_WORK_EVENT, stepAside);
  }, [open, layout, hide]);

  // Until the panel chunk takes over, keep focus on the frame so it is never stranded on the hidden launcher.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const frame = frameRef.current;
      if (frame && !frame.hidden && !frame.contains(document.activeElement)) frame.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Bridge: "Ask about this project", the Intro CTA and any other page entry point.
  useEffect(() => {
    let frameId = 0;
    const unsubscribe = subscribeAskAssistant((detail) => {
      // An ask from a project modal arrives after the modal unmounted, with focus on <body>.
      const active = document.activeElement;
      const opener = active instanceof HTMLElement && active !== document.body ? active : null;
      setPendingAsk(detail);

      cancelAnimationFrame(frameId);
      let frames = 0;
      const tryOpen = () => {
        if (document.querySelector('[data-slot="dialog-content"]') && frames < MAX_DEFER_FRAMES) {
          frames += 1;
          frameId = requestAnimationFrame(tryOpen);
          return;
        }
        openPanel(opener);
      };
      tryOpen();
    });

    return () => {
      unsubscribe();
      cancelAnimationFrame(frameId);
    };
  }, [openPanel]);

  // Warm the panel chunk once the page is idle, like Projects warms ProjectModal.
  useEffect(() => {
    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(prefetchPanel, { timeout: 4000 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }
    const timeout = setTimeout(prefetchPanel, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // "Larger panel" applies only where it is offered; the choice is kept for when it is offered again.
  const isExpanded = expanded && canExpand;

  const panelProps: ChatPanelProps = {
    open,
    layout,
    short,
    coarse,
    canExpand,
    expanded: isExpanded,
    onToggleExpanded: toggleExpanded,
    onHide: hide,
    onReplySettled: handleReplySettled,
    pendingAsk,
    onAskConsumed: handleAskConsumed,
    frameRef,
  };

  return (
    <div ref={rootRef} data-chat-root className="contents">
      <ChatAnnouncerProvider>
        <ChatLauncher
          ref={launcherRef}
          unread={unread}
          hidden={open}
          controlsId={mounted ? PANEL_ID : undefined}
          onOpen={handleLauncherOpen}
          onPrefetch={prefetchPanel}
        />
        {mounted && (
          <ChatPanelFrame
            ref={frameRef}
            open={open}
            expanded={isExpanded}
            layout={layout}
            short={short}
            rootRef={rootRef}
          >
            <ChatErrorBoundary
              resetKey={attempt}
              open={open}
              frameRef={frameRef}
              onRetry={retryPanel}
              onClose={closeFromFrame}
            >
              <Suspense fallback={<ChatPanelSkeleton open={open} frameRef={frameRef} onClose={closeFromFrame} />}>
                <LazyPanel {...panelProps} />
              </Suspense>
            </ChatErrorBoundary>
          </ChatPanelFrame>
        )}
      </ChatAnnouncerProvider>
    </div>
  );
}

/** Renders nothing on a deploy without a configured assistant (isAssistantAvailable warns once). */
export default function ChatBot() {
  return isAssistantAvailable() ? <ChatAssistant /> : null;
}
