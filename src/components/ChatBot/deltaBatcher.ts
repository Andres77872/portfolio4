import { DELTA_FLUSH_MS } from './constants';

export interface DeltaBatcher {
  push(text: string): void;
  /** Emits the buffered text synchronously and cancels the pending timer. */
  flush(): void;
  /** Drops the buffered text. */
  cancel(): void;
}

/**
 * Coalesces streamed text so the transcript re-renders at most once per `delayMs`.
 * The timer is trailing and not reset by later pushes, which bounds the latency.
 */
export function createDeltaBatcher(onFlush: (text: string) => void, delayMs = DELTA_FLUSH_MS): DeltaBatcher {
  let buffer = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const flush = () => {
    clearTimer();
    if (!buffer) return;
    const text = buffer;
    buffer = '';
    onFlush(text);
  };

  return {
    push(text) {
      if (!text) return;
      buffer += text;
      if (timer === null) timer = setTimeout(flush, delayMs);
    },
    flush,
    cancel() {
      clearTimer();
      buffer = '';
    },
  };
}
