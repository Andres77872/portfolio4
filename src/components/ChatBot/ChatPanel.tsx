import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { X } from 'lucide-react';

import { catalog, findProjectBySlug } from '@/components/Projects/catalog';
import { getProjectHref } from '@/components/Projects/projectLink';
import type { AskAssistantDetail } from '@/lib/assistant';
import { cn } from '@/lib/utils';

import ChatComposer, { type ComposerHandle } from './ChatComposer';
import ChatHeader from './ChatHeader';
import ChatLink from './ChatLink';
import ChatTranscript from './ChatTranscript';
import ChatWelcome, { SuggestionChips } from './ChatWelcome';
import { useAnnounce } from './chatAnnouncerContext';
import { ERROR_COPY } from './chatErrors';
import { ChatNavContext, type ChatNav, type HideOptions } from './chatNavContext';
import { toPlainText, truncateOnWord } from './chatText';
import { ANNOUNCE_REPLY_TEXT, MAX_INPUT_CHARS, REPLY_ANNOUNCE_MAX_CHARS } from './constants';
import { selectBusy, type AssistantTurn } from './conversation';
import { useChat, type SendResult } from './hooks/useChat';
import { useChatPanelFocus } from './hooks/useChatPanelFocus';
import { isPanelEscapeTarget, useChatEscape } from './hooks/useChatEscape';
import type { PanelLayout } from './hooks/usePanelLayout';
import { focusRing } from './styles';
import { getProjectSuggestions } from './suggestions';

export interface ChatPanelProps {
  open: boolean;
  layout: PanelLayout;
  short: boolean;
  coarse: boolean;
  canExpand: boolean;
  expanded: boolean;
  onToggleExpanded(): void;
  onHide(options?: HideOptions): void;
  /** Root: a reply that settles while the panel is hidden sets the launcher's unread dot. */
  onReplySettled(turn: AssistantTurn): void;
  pendingAsk: AskAssistantDetail | null;
  onAskConsumed(): void;
  frameRef: RefObject<HTMLDivElement>;
}

const DEFAULT_PLACEHOLDER = 'Ask about a project, a technology or availability…';
const LIMIT_NOTICE = `Message is over ${MAX_INPUT_CHARS.toLocaleString('en-US')} characters.`;
const BUSY_NOTICE = 'Still answering. Stop it or wait.';

const describeSettled = (turn: AssistantTurn): string => {
  if (turn.status === 'stopped') return 'Answer stopped. The partial answer is kept.';
  if (turn.status === 'error') {
    const copy = ERROR_COPY[turn.error ?? 'unavailable'];
    return copy.actions.includes('retry') ? `${copy.title} Retry is available.` : copy.title;
  }
  if (!ANNOUNCE_REPLY_TEXT) return 'Assistant replied.';
  const { text, truncated } = truncateOnWord(toPlainText(turn.content), REPLY_ANNOUNCE_MAX_CHARS);
  return `Assistant replied: ${text}${truncated ? '… Full answer in the conversation.' : ''}`;
};

/**
 * The loaded panel (lazy chunk): owns the conversation, focus rules, layered Escape, the
 * New chat confirmation and the "ask about a project" hand-off. Hiding never aborts: the
 * frame only gets `hidden`, so this component and its stream stay alive.
 */
export default function ChatPanel({
  open,
  layout,
  short,
  coarse,
  canExpand,
  expanded,
  onToggleExpanded,
  onHide,
  onReplySettled,
  pendingAsk,
  onAskConsumed,
  frameRef,
}: ChatPanelProps) {
  const announce = useAnnounce();
  const composerRef = useRef<ComposerHandle>(null);
  const [confirming, setConfirming] = useState(false);
  const [showFocusChips, setShowFocusChips] = useState(false);
  const [stickSignal, setStickSignal] = useState(0);

  const chat = useChat({
    onSettled: (turn) => {
      announce(open ? describeSettled(turn) : 'The portfolio assistant replied.');
      onReplySettled(turn);
    },
  });
  const { items, busy, focusSlug, send, stop, retry, reset, focusProject: setFocusProject, clearFocus } = chat;
  const focusProject = useMemo(() => findProjectBySlug(catalog, focusSlug), [focusSlug]);
  const hasItems = items.length > 0;

  useChatPanelFocus({ open, coarse, frameRef, composerRef, busy, itemCount: items.length });

  useChatEscape(frameRef, open, (event) => {
    if (confirming) {
      event.preventDefault();
      setConfirming(false);
      return;
    }
    if (!isPanelEscapeTarget(event.target, frameRef.current)) return;
    event.preventDefault();
    onHide();
  });

  // "Ask about this project": pre-focus the conversation, never send and never interrupt.
  useEffect(() => {
    if (!pendingAsk) return;
    const slug = pendingAsk.projectSlug;
    if (slug && findProjectBySlug(catalog, slug)) {
      setFocusProject(slug);
      setShowFocusChips(true);
    } else if (!hasItems) {
      // A general ask (the Intro CTA) must not reopen a project-focused welcome left over from an
      // abandoned "Ask about this project": the empty state has no control to clear that focus.
      clearFocus();
      setShowFocusChips(false);
    }
    onAskConsumed();
  }, [pendingAsk, hasItems, setFocusProject, clearFocus, onAskConsumed]);

  const focusComposer = useCallback(() => composerRef.current?.focus(), []);

  const handleSend = useCallback(
    (text: string): SendResult => {
      const result = send(text);
      if (result.ok) {
        announce('Assistant is thinking.');
        setShowFocusChips(false);
        setStickSignal((value) => value + 1);
      }
      return result;
    },
    [send, announce],
  );

  // Focus moves to the composer before the state change, so it is safe when the chip unmounts.
  const handlePick = useCallback(
    (prompt: string) => {
      focusComposer();
      // Context bar chips stay clickable mid-answer; say why nothing was sent.
      const result = handleSend(prompt);
      if (!result.ok && result.reason === 'busy') announce(BUSY_NOTICE);
    },
    [focusComposer, handleSend, announce],
  );

  // Read in the retry handler so it stays stable and memoized turns skip re-rendering on every delta.
  const itemsRef = useRef(items);
  useLayoutEffect(() => {
    itemsRef.current = items;
  });

  const handleRetry = useCallback(
    (id: string) => {
      focusComposer();
      const current = itemsRef.current;
      if (selectBusy(current) || current[current.length - 1]?.id !== id) return;
      retry(id);
      announce('Assistant is thinking.');
    },
    [focusComposer, retry, announce],
  );

  const openConfirm = useCallback(() => setConfirming(true), []);
  const cancelConfirm = useCallback(() => setConfirming(false), []);

  const handleClear = useCallback(() => {
    reset();
    setConfirming(false);
    setShowFocusChips(false);
    announce('Conversation cleared.');
    if (coarse) frameRef.current?.focus({ preventScroll: true });
    else focusComposer();
  }, [reset, announce, coarse, frameRef, focusComposer]);

  const handleClearFocus = useCallback(() => {
    focusComposer();
    clearFocus();
    setShowFocusChips(false);
  }, [focusComposer, clearFocus]);

  const handleBusyEnter = useCallback(() => announce(BUSY_NOTICE), [announce]);
  const handleLimitCrossed = useCallback(() => announce(LIMIT_NOTICE), [announce]);
  const handleClose = useCallback(() => onHide(), [onHide]);

  const nav = useMemo<ChatNav>(() => ({ layout, onHide, announce }), [layout, onHide, announce]);

  const focusSuggestions = useMemo(
    () => (focusProject && showFocusChips ? getProjectSuggestions(focusProject) : null),
    [focusProject, showFocusChips],
  );

  return (
    <ChatNavContext.Provider value={nav}>
      <ChatHeader
        busy={busy}
        hasItems={hasItems}
        confirming={confirming}
        onConfirmStart={openConfirm}
        onConfirmCancel={cancelConfirm}
        onConfirmClear={handleClear}
        canExpand={canExpand}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        onClose={handleClose}
      />

      {hasItems ? (
        <ChatTranscript
          items={items}
          busy={busy}
          onRetry={handleRetry}
          onNewChat={openConfirm}
          stickSignal={stickSignal}
        />
      ) : (
        <ChatWelcome focusProject={focusProject} onPick={handlePick} onClearFocus={handleClearFocus} />
      )}

      {focusProject && hasItems && (
        <div className="mx-3 mb-1.5 flex shrink-0 flex-wrap items-center gap-2 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">
          <span>
            About <ChatLink href={getProjectHref(focusProject.slug)}>{focusProject.title}</ChatLink>
          </span>
          <button
            type="button"
            aria-label={`Stop focusing on ${focusProject.title}`}
            onClick={handleClearFocus}
            className={cn(
              '-my-1.5 inline-flex size-8 items-center justify-center rounded-md hover:text-foreground pointer-coarse:size-11',
              focusRing,
            )}
          >
            <X aria-hidden className="size-3" />
          </button>
          {focusSuggestions && (
            <SuggestionChips
              suggestions={focusSuggestions}
              onPick={handlePick}
              label={`Questions about ${focusProject.title}`}
              className="basis-full font-sans normal-case tracking-normal"
            />
          )}
        </div>
      )}

      <ChatComposer
        ref={composerRef}
        busy={busy}
        placeholder={focusProject ? `Ask about ${focusProject.title}…` : DEFAULT_PLACEHOLDER}
        onSend={handleSend}
        onStop={stop}
        onBusyEnter={handleBusyEnter}
        onLimitCrossed={handleLimitCrossed}
        shortLayout={short}
      />
    </ChatNavContext.Provider>
  );
}
