import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import ChatDisclosure from './ChatDisclosure';
import { COMPOSER_ID, COUNTER_FROM, COUNTER_ID, DISCLOSURE_ID, MAX_INPUT_CHARS } from './constants';
import type { SendResult } from './hooks/useChat';
import { focusRing } from './styles';

export interface ComposerHandle {
  focus(): void;
}

export interface ChatComposerProps {
  busy: boolean;
  placeholder: string;
  /** The draft is cleared only when this returns `{ ok: true }`. */
  onSend(text: string): SendResult;
  onStop(): void;
  /** Enter while an answer streams (once per stream). */
  onBusyEnter(): void;
  /** The draft crossed MAX_INPUT_CHARS. */
  onLimitCrossed(): void;
  shortLayout: boolean;
}

/** Clicks on Stop this soon after sending are treated as part of the send gesture. */
const STOP_GUARD_MS = 400;
const MAX_TEXTAREA_PX = 128;

const formatCount = (value: number) => value.toLocaleString('en-US');

/**
 * Message box plus the panel disclosure (the counter lives in the disclosure row). The
 * composer owns the draft, so typing never re-renders the panel. The textarea is never
 * disabled, and Send/Stop is one persistent button node, so focus survives every state.
 */
const ChatComposer = forwardRef<ComposerHandle, ChatComposerProps>(function ChatComposer(
  { busy, placeholder, onSend, onStop, onBusyEnter, onLimitCrossed, shortLayout },
  ref,
) {
  const [draft, setDraft] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  const busyNoticeRef = useRef(false);
  const busySinceRef = useRef(0);

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }), []);

  // Once per stream: the notice may play again after the current answer settles.
  useEffect(() => {
    if (busy) busySinceRef.current = Date.now();
    else busyNoticeRef.current = false;
  }, [busy]);

  const fitHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_PX)}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_PX ? 'auto' : 'hidden';
  }, []);

  useLayoutEffect(fitHeight, [draft, fitHeight]);

  // The same draft wraps differently after "Larger panel", a sheet/floating switch or a rotation.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || typeof ResizeObserver === 'undefined') return;
    let width = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth === width) return;
      width = textarea.clientWidth;
      fitHeight();
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [fitHeight]);

  const length = draft.length;
  const over = length > MAX_INPUT_CHARS;
  const showCounter = length >= COUNTER_FROM;
  const canSend = !busy && !over && draft.trim() !== '';

  const submit = () => {
    if (busy) {
      if (draft.trim() && !busyNoticeRef.current) {
        busyNoticeRef.current = true;
        onBusyEnter();
      }
      return;
    }
    if (!canSend) return;
    if (onSend(draft).ok) setDraft('');
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    if (next.length > MAX_INPUT_CHARS && !over) onLimitCrossed();
    setDraft(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    const native = event.nativeEvent;
    if (composingRef.current || native.isComposing || native.keyCode === 229) return;
    event.preventDefault();
    submit();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleStop = (event: MouseEvent<HTMLButtonElement>) => {
    // The same node becomes a submit button on this very click; never let it submit.
    event.preventDefault();
    // Send turns this node into Stop, so the second click of a double-click (or double-tap)
    // would stop the answer that was just requested.
    if (event.detail > 1 || Date.now() - busySinceRef.current < STOP_GUARD_MS) return;
    onStop();
  };

  const counter = showCounter ? (
    <span
      id={COUNTER_ID}
      className={cn(
        'shrink-0 whitespace-nowrap font-mono text-[0.625rem] tabular-nums',
        over ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {formatCount(length)} / {formatCount(MAX_INPUT_CHARS)}
      {over && ' · shorten to send'}
    </span>
  ) : null;

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="shrink-0 px-3 pt-2">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background/60 p-1.5 has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-solid has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-ring contrast-more:border-foreground/60">
          <textarea
            ref={textareaRef}
            id={COMPOSER_ID}
            value={draft}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
            onFocus={shortLayout ? () => formRef.current?.scrollIntoView({ block: 'nearest' }) : undefined}
            aria-label="Message the portfolio assistant"
            aria-describedby={showCounter ? `${DISCLOSURE_ID} ${COUNTER_ID}` : DISCLOSURE_ID}
            aria-invalid={over || undefined}
            placeholder={placeholder}
            rows={1}
            enterKeyHint="send"
            autoComplete="off"
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground sm:text-sm sm:leading-5 pointer-coarse:text-base pointer-coarse:leading-6"
          />
          <Button
            type={busy ? 'button' : 'submit'}
            variant={busy ? 'outline' : 'ghost'}
            aria-label={busy ? 'Stop answer' : 'Send message'}
            aria-disabled={busy ? undefined : !canSend}
            onClick={busy ? handleStop : undefined}
            className={cn(
              'size-8 shrink-0 rounded-lg pointer-coarse:size-10',
              !busy && (canSend ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : 'text-muted-foreground'),
              focusRing,
            )}
          >
            {busy ? <Square className="size-3.5 fill-current" /> : <ArrowUp className="size-4" />}
          </Button>
        </div>
      </form>
      <ChatDisclosure counter={counter} />
    </>
  );
});

export default memo(ChatComposer);
