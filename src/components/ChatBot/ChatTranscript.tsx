import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { ArrowDown } from 'lucide-react';

import { cn } from '@/lib/utils';

import ChatTurn from './ChatTurn';
import { SHOW_PROJECT_CARDS } from './constants';
import { assignProjectCards, type ChatItem } from './conversation';
import { useStickToBottom } from './hooks/useStickToBottom';
import { focusRing } from './styles';

export interface ChatTranscriptProps {
  items: readonly ChatItem[];
  busy: boolean;
  onRetry(id: string): void;
  onNewChat(): void;
  /** Bumped on every accepted send so the visitor's own message always re-sticks the view. */
  stickSignal: number;
}

const NO_CARDS: readonly string[] = [];

/**
 * The conversation: a focusable, natively scrolling region. It is deliberately not a live
 * region (the announcer speaks once per event), and in-flight turns carry `aria-busy`.
 */
export default function ChatTranscript({ items, busy, onRetry, onNewChat, stickSignal }: ChatTranscriptProps) {
  const regionRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const jumpRef = useRef<HTMLButtonElement>(null);
  const jumpFocusedRef = useRef(false);

  const contentLength = items.reduce((total, item) => total + item.content.length, 0) + items.length;
  const { showJump, forceStick, jumpToLatest } = useStickToBottom(regionRef, listRef, contentLength);

  useEffect(() => {
    if (stickSignal > 0) forceStick();
  }, [stickSignal, forceStick]);

  // Card arrays keep their identity while their slugs are unchanged, so memoized turns skip re-rendering.
  const cardCache = useRef(new Map<string, readonly string[]>());
  const cards = useMemo(() => {
    const next = new Map<string, readonly string[]>();
    if (!SHOW_PROJECT_CARDS) return next;
    for (const [id, slugs] of assignProjectCards(items)) {
      const previous = cardCache.current.get(id);
      next.set(id, previous && previous.join(' ') === slugs.join(' ') ? previous : slugs);
    }
    cardCache.current = next;
    return next;
  }, [items]);

  // If "Jump to latest" had focus when it disappeared, keep the visitor in the conversation.
  useLayoutEffect(() => {
    if (showJump || !jumpFocusedRef.current) return;
    jumpFocusedRef.current = false;
    const active = document.activeElement;
    if (!active || active === document.body) regionRef.current?.focus({ preventScroll: true });
  }, [showJump]);

  const handleJump = () => {
    if (document.activeElement === jumpRef.current) regionRef.current?.focus({ preventScroll: true });
    jumpFocusedRef.current = false;
    jumpToLatest();
  };

  const lastIndex = items.length - 1;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col group-data-[short]/panel:h-40 group-data-[short]/panel:flex-none">
      <div
        ref={regionRef}
        role="region"
        aria-label="Conversation"
        tabIndex={0}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <ol ref={listRef} className="flex flex-col gap-5 px-4 py-4">
          {items.map((item, index) => (
            <ChatTurn
              key={item.id}
              item={item}
              isLast={index === lastIndex}
              busy={index === lastIndex ? busy : false}
              cardSlugs={cards.get(item.id) ?? NO_CARDS}
              onRetry={onRetry}
              onNewChat={onNewChat}
            />
          ))}
        </ol>
      </div>
      {showJump && (
        <button
          ref={jumpRef}
          type="button"
          onClick={handleJump}
          onFocus={() => {
            jumpFocusedRef.current = true;
          }}
          onBlur={(event) => {
            // A removed button may blur with no next target; that case is handled above.
            if (event.relatedTarget) jumpFocusedRef.current = false;
          }}
          className={cn(
            'absolute bottom-3 left-1/2 inline-flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm pointer-coarse:h-11',
            focusRing,
          )}
        >
          <ArrowDown aria-hidden className="size-3.5" />
          Jump to latest
        </button>
      )}
    </div>
  );
}
